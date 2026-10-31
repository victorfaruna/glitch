import assert from "node:assert/strict";
import { test } from "node:test";
import { createMockAgent, makeStepEvent, SCENARIO_LENGTH } from "./mock-agent";
import { DEMO_CUSTOMER, emptyStore, updateBrowser } from "./demo-store";
import { createSession, findingReport, initialWorkspace, restoreWorkspace, validateTarget, workspaceReducer } from "./workspace-state";
import type { AgentEvent, WorkspaceState } from "./types";

const timestamp = "2026-10-31T12:00:00.000Z";

function harness() {
  let state: WorkspaceState = { version: 1, activeId: "test", sessions: [createSession("test", timestamp)] };
  state = workspaceReducer(state, { type: "session.send", id: "message", content: "Test checkout twice, please.", timestamp });
  let nextHandle = 0;
  const pending = new Map<number, () => void>();
  const cancelled: (() => void)[] = [];
  const emitted: AgentEvent[] = [];
  const adapter = createMockAgent({
    getSession: () => state.sessions[0],
    emit(event) { emitted.push(event); state = workspaceReducer(state, { type: "session.agent", sessionId: "test", run: 1, event }); },
    scheduler: {
      set(callback) { const handle = ++nextHandle; pending.set(handle, callback); return handle; },
      clear(handle) { const callback = pending.get(handle as number); if (callback) cancelled.push(callback); pending.delete(handle as number); },
    },
  });
  return {
    adapter, emitted, pending, cancelled,
    state: () => state,
    dispatch: (event: Parameters<typeof workspaceReducer>[1]) => { state = workspaceReducer(state, event); },
    tick() { const next = pending.entries().next().value; if (next) { pending.delete(next[0]); next[1](); } },
  };
}

test("checkout walkthrough emits matching snapshots, duplicate orders, and a reproducible finding", () => {
  const h = harness(); h.adapter.start();
  for (let i = 0; i < SCENARIO_LENGTH + 1; i++) h.tick();
  const session = h.state().sessions[0];
  assert.equal(session.status, "completed");
  assert.equal(session.replay.length, SCENARIO_LENGTH);
  assert.equal(session.browser.orders.length, 4);
  assert.deepEqual(session.browser.orders.map((order) => order.total), [32, 32, 32, 32]);
  assert.deepEqual(session.findings[0].evidence, session.browser.orders);
  assert.equal(new Set(session.actions.map((action) => action.id)).size, SCENARIO_LENGTH);
  assert.equal(session.replay[0].snapshot.page, "products");
  assert.equal(session.replay[6].snapshot.pendingSubmissions, 1);
  assert.equal(session.replay[7].snapshot.pendingSubmissions, 2);
  assert.equal(session.replay[8].snapshot.orders.length, 2);
  assert.equal(session.replay[11].snapshot.orders.length, 4);
  assert.ok(findingReport(session, session.findings[0].id).includes("Synthetic demo evidence"));
  assert.equal(h.pending.size, 0);
});

test("pause cancels pending work and repeated resume does not duplicate events", () => {
  const h = harness(); h.adapter.start(); h.tick(); h.tick();
  h.adapter.pause(); h.dispatch({ type: "session.control", status: "paused" });
  assert.equal(h.pending.size, 0);
  // Even a callback already queued by the host must be harmless after pause.
  h.cancelled.forEach((callback) => callback());
  assert.equal(h.state().sessions[0].cursor, 2);
  h.dispatch({ type: "session.control", status: "running" });
  h.adapter.resume(); h.adapter.resume(); h.adapter.resume();
  h.cancelled.forEach((callback) => callback());
  h.adapter.resume();
  assert.equal(h.pending.size, 1);
  h.tick();
  assert.equal(h.state().sessions[0].cursor, 3);
  assert.equal(h.state().sessions[0].actions.length, 3);
  h.adapter.cancel();
});

test("manual edits survive handback and the next action uses the updated store", () => {
  const h = harness(); h.adapter.start();
  for (let i = 0; i < 4; i++) h.tick();
  h.adapter.pause(); h.dispatch({ type: "session.control", status: "manual" });
  h.dispatch({ type: "browser.command", command: { type: "add", productId: "mug" } });
  assert.equal(h.state().sessions[0].browser.cart.length, 2);
  h.dispatch({ type: "session.control", status: "running" }); h.adapter.resume(); h.tick();
  const session = h.state().sessions[0];
  assert.equal(session.browser.page, "checkout");
  assert.equal(session.browser.cart.length, 2);
  assert.equal(session.replay[4].snapshot.cart.length, 2);
  assert.equal(session.replay[3].snapshot.cart.length, 1);
  assert.match(session.messages.at(-1)!.content, /current demo state/);
  h.adapter.cancel();
});

test("new sessions reject late agent events and old manual checkout timers", () => {
  const h = harness(); h.adapter.start(); h.tick();
  const lateEvent = makeStepEvent(h.state().sessions[0], timestamp)!;
  h.dispatch({ type: "session.new", id: "fresh", timestamp }); h.adapter.cancel();
  h.dispatch({ type: "session.agent", sessionId: "test", run: 1, event: lateEvent });
  h.dispatch({ type: "browser.command", sessionId: "test", command: { type: "settle" } });
  h.cancelled.forEach((callback) => callback());
  assert.equal(h.state().activeId, "fresh");
  assert.equal(h.state().sessions[0].status, "idle");
  assert.equal(h.state().sessions[0].actions.length, 0);
  assert.equal(h.state().sessions[0].browser.orders.length, 0);
  assert.equal(h.state().sessions[1].cursor, 1);
});

test("recoverable interruptions resume at the saved cursor", () => {
  const h = harness(); h.adapter.start(); h.tick(); h.tick();
  h.adapter.pause(); h.dispatch({ type: "session.interrupt" });
  assert.equal(h.state().sessions[0].status, "error");
  h.dispatch({ type: "session.control", status: "running" }); h.adapter.resume(); h.tick();
  assert.equal(h.state().sessions[0].cursor, 3);
  assert.equal(h.state().sessions[0].error, null);
  h.adapter.cancel();
});

test("persistence restores running sessions paused and rejects damaged storage", () => {
  const h = harness(); h.adapter.start(); h.tick();
  const restored = restoreWorkspace(JSON.stringify(h.state()));
  assert.equal(restored?.sessions[0].status, "paused");
  assert.equal(restored?.sessions[0].cursor, 1);
  assert.equal(restoreWorkspace("not json"), null);
  assert.equal(restoreWorkspace('{"version":1,"sessions":[{}]}'), null);
  assert.equal(restoreWorkspace(JSON.stringify({ ...h.state(), activeId: "missing" })), null);
  const damaged = structuredClone(h.state());
  damaged.sessions[0].replay[0].snapshot.customer = null as never;
  assert.equal(restoreWorkspace(JSON.stringify(damaged)), null);
  h.adapter.cancel();
});

test("finding evidence remains anchored to recorded snapshots after manual reset", () => {
  const h = harness(); h.adapter.start();
  for (let i = 0; i < SCENARIO_LENGTH; i++) h.tick();
  h.adapter.pause(); h.dispatch({ type: "session.control", status: "manual" });
  h.dispatch({ type: "browser.command", command: { type: "reset" } });
  assert.equal(h.state().sessions[0].browser.orders.length, 0);
  h.dispatch({ type: "session.control", status: "running" }); h.adapter.resume(); h.tick();
  assert.equal(h.state().sessions[0].findings[0].evidence.length, 4);
  assert.equal(h.state().sessions[0].status, "completed");
  h.adapter.cancel();
});

test("targets are validated, actual messages preserved, and unsupported tasks are transparent", () => {
  assert.deepEqual(validateTarget("javascript:alert(1)"), { error: "Enter a valid http:// or https:// URL without embedded credentials." });
  assert.ok("error" in validateTarget("https://secret:password@example.test"));
  assert.deepEqual(validateTarget("http://localhost:3000"), { url: "http://localhost:3000/" });
  let state = initialWorkspace();
  const content = "  Hello Glitch.\nCan you write an essay?  ";
  state = workspaceReducer(state, { type: "session.send", content, id: "hello", timestamp });
  assert.equal(state.sessions[0].messages[0].content, content);
  assert.equal(state.sessions[0].status, "idle");
  assert.match(state.sessions[0].messages[1].content, /AI browser testing agent/);
  state = workspaceReducer(state, { type: "session.target", target: { kind: "custom", url: "https://example.test/" } });
  state = workspaceReducer(state, { type: "session.send", content: "Test checkout", id: "test", timestamp });
  assert.match(state.sessions[0].messages.at(-1)!.content, /https:\/\/example\.test\//);
  assert.equal(state.sessions[0].target.url, "https://example.test/");
});

test("selecting sample sessions updates their distinct findings and viewport", () => {
  let state = initialWorkspace();
  state = workspaceReducer(state, { type: "session.select", id: "sample-checkout" });
  const checkout = state.sessions.find((s) => s.id === state.activeId)!;
  assert.equal(checkout.findings.length, 1);
  assert.equal(checkout.replay.length, SCENARIO_LENGTH);
  state = workspaceReducer(state, { type: "session.select", id: "sample-mobile" });
  const mobile = state.sessions.find((s) => s.id === state.activeId)!;
  assert.equal(mobile.findings.length, 0);
  assert.equal(mobile.viewport, "mobile");
});

test("manual storefront validates details and demonstrates the same repeated-submit bug", () => {
  let store = updateBrowser(emptyStore(), { type: "add", productId: "tote" });
  store = updateBrowser(store, { type: "navigate", page: "checkout" });
  store = updateBrowser(store, { type: "submit" });
  assert.equal(store.submitting, false);
  assert.match(store.error!, /Complete all fields/);
  for (const field of Object.keys(DEMO_CUSTOMER) as (keyof typeof DEMO_CUSTOMER)[]) {
    store = updateBrowser(store, { type: "customer", field, value: DEMO_CUSTOMER[field] });
  }
  store = updateBrowser(store, { type: "submit" });
  assert.equal(store.submitting, true);
  assert.equal(store.pendingSubmissions, 1);
  store = updateBrowser(store, { type: "submit" });
  store = updateBrowser(store, { type: "settle" });
  assert.equal(store.page, "confirmation");
  assert.equal(store.orders.length, 2);
  assert.equal(store.orders[0].total, 32);
  store = updateBrowser(store, { type: "navigate", page: "products" });
  assert.equal(store.cart.length, 0);
  assert.equal(store.attempt, 2);
});

test("conversational messages stay idle with smart replies, while URLs and test prompts trigger testing runs", () => {
  let state = initialWorkspace();
  // 1. Casual greeting
  state = workspaceReducer(state, { type: "session.send", content: "Hey", id: "m1", timestamp });
  assert.equal(state.sessions[0].status, "idle");
  assert.match(state.sessions[0].messages.at(-1)!.content, /Hey!/);

  // 2. Capability question
  state = workspaceReducer(state, { type: "session.send", content: "What can you do?", id: "m2", timestamp });
  assert.equal(state.sessions[0].status, "idle");
  assert.match(state.sessions[0].messages.at(-1)!.content, /Live Browser Automation/);

  // 3. Giving a URL triggers a live testing run
  state = workspaceReducer(state, { type: "session.send", content: "Check https://github.com/trending", id: "m3", timestamp });
  assert.equal(state.sessions[0].status, "running");
  assert.equal(state.sessions[0].target.url, "https://github.com/trending");
  assert.match(state.sessions[0].messages.at(-1)!.content, /https:\/\/github\.com\/trending/);
});
