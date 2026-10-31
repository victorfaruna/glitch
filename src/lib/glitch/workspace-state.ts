import { emptyStore, updateBrowser } from "./demo-store";
import { createFinding, makeStepEvent, SCENARIO_LENGTH } from "./mock-agent";
import type { AgentAction, DemoStoreState, Finding, Message, Order, ReplayStep, Session, SessionStatus, WorkspaceEvent, WorkspaceState } from "./types";

export const STORAGE_KEY = "glitch-workspace-v1";
const activeStatuses: SessionStatus[] = ["running", "paused", "manual"];

export function createSession(id: string, timestamp: string): Session {
  return {
    id, title: "Untitled session", createdAt: timestamp, sample: false,
    status: "idle", target: { kind: "demo", url: "https://demo.glitch.local" }, viewport: "desktop",
    messages: [], actions: [], findings: [], replay: [], browser: emptyStore(),
    cursor: 0, run: 0, error: null,
  };
}

function createSampleSession(mobile = false): Session {
  const id = mobile ? "sample-mobile" : "sample-checkout";
  const timestamp = "2026-10-31T09:30:00.000Z";
  let session = createSession(id, timestamp);
  session = {
    ...session, sample: true, run: 1, status: "running", viewport: mobile ? "mobile" : "desktop",
    title: mobile ? "Mobile checkout walkthrough" : "Checkout · duplicate submission",
    messages: [
      { id: `${id}-user`, role: "user", timestamp, content: mobile ? "Try checkout on a mobile screen." : "Test the checkout flow. Check whether submitting twice creates duplicate orders." },
      { id: `${id}-intro`, role: "assistant", timestamp, kind: "intro", content: "This is a sample session from the scripted UI demo. All customer details, actions, and evidence are synthetic." },
    ],
  };
  for (let i = 0; i < (mobile ? 6 : SCENARIO_LENGTH); i++) {
    const event = makeStepEvent(session, new Date(Date.parse(timestamp) + (i + 1) * 1500).toISOString());
    if (event?.type === "agent.step") {
      session = { ...session, cursor: event.cursor, browser: event.browser, actions: [...session.actions, event.action], replay: [...session.replay, event.replay] };
    }
  }
  return {
    ...session, status: "completed", findings: mobile ? [] : [createFinding(session)],
    messages: [...session.messages, {
      id: `${id}-result`, role: "assistant", kind: "result", timestamp: "2026-10-31T09:30:20.000Z",
      content: mobile ? "Sample walkthrough complete. The mobile preview reached checkout with synthetic details. This short sample contains no findings; start a new checkout test to run the full duplicate-order scenario." : "The sample checkout test reproduced duplicate orders in two attempts. Open the finding to inspect the synthetic evidence or walk through the demo replay.",
    }],
  };
}

export function initialWorkspace(): WorkspaceState {
  return { version: 1, activeId: "welcome", sessions: [
    createSession("welcome", "2026-10-31T10:00:00.000Z"), createSampleSession(), createSampleSession(true),
  ] };
}

function pauseBackground(session: Session): Session {
  return session.status === "running" || session.status === "manual" ? { ...session, status: "paused" } : session;
}

export function workspaceReducer(state: WorkspaceState, event: WorkspaceEvent): WorkspaceState {
  if (event.type === "session.new") {
    const session = createSession(event.id, event.timestamp);
    return { ...state, activeId: session.id, sessions: [session, ...state.sessions.map(pauseBackground)].slice(0, 15) };
  }
  if (event.type === "session.select") {
    if (!state.sessions.some((s) => s.id === event.id)) return state;
    return { ...state, activeId: event.id, sessions: state.sessions.map(pauseBackground) };
  }

  const sessionId = event.type === "session.agent" ? event.sessionId : state.activeId;
  const sessions = state.sessions.map((session): Session => {
    if (session.id !== sessionId) return session;
    switch (event.type) {
      case "session.send": {
        const content = event.content;
        if (!content.trim()) return session;
        const messages = [...session.messages, { id: event.id, role: "user" as const, content, timestamp: event.timestamp }];

        if (event.reply === "") {
          return {
            ...session,
            messages,
          };
        }

        const testing = isTestingIntent(content);
        if (!testing) {
          return {
            ...session,
            messages: [
              ...messages,
              {
                id: `${event.id}-reply`,
                role: "assistant",
                timestamp: event.timestamp,
                content: getConversationalReply(content),
              },
            ],
          };
        }

        const busy = activeStatuses.includes(session.status) && session.run > 0;
        if (busy) {
          return {
            ...session,
            messages: [
              ...messages,
              {
                id: `${event.id}-reply`,
                role: "assistant",
                timestamp: event.timestamp,
                content: "A test is already in progress. Resume it with the controls above the browser, or start a new session for another test. Your message has been saved.",
              },
            ],
          };
        }

        const urlMatch = content.match(/https?:\/\/[^\s]+/i) || content.match(/\b(?:localhost|\d{1,3}(?:\.\d{1,3}){3}):\d+[^\s]*/i);
        let target = session.target;
        if (urlMatch) {
          const validated = validateTarget(urlMatch[0]);
          if ("url" in validated) {
            target = { kind: "custom", url: validated.url };
          }
        }

        const introContent = target.kind === "custom"
          ? `I’m launching the AI browser testing agent on ${target.url} to test: "${content.trim()}". I’ll inspect the page, exercise interactive controls, and document any findings.`
          : content.toLowerCase().includes("checkout")
            ? `I’ll test the checkout flow: add items to the cart, test repeated submission resilience, and verify order confirmation. You can pause or take control at any time.`
            : `I’m starting the browser testing agent to test: "${content.trim()}". I’ll observe UI states, exercise interactive controls, and capture any issues.`;

        return {
          ...session,
          target,
          title: content.trim().length > 43 ? `${content.trim().slice(0, 43)}…` : content.trim(),
          sample: false,
          status: "running",
          cursor: 0,
          run: session.run + 1,
          error: null,
          browser: emptyStore(),
          findings: [],
          replay: [],
          actions: [],
          viewport: /mobile/i.test(content) ? "mobile" : session.viewport,
          messages: [
            ...messages,
            {
              id: `${event.id}-intro`,
              role: "assistant",
              kind: "intro",
              timestamp: event.timestamp,
              content: introContent,
            },
          ],
        };
      }
      case "session.reply": {
        const isTest = Boolean(event.isTest);
        const target = event.target || session.target;
        return {
          ...session,
          target,
          status: isTest ? "running" : session.status,
          run: isTest ? session.run + 1 : session.run,
          cursor: isTest ? 0 : session.cursor,
          actions: isTest ? [] : session.actions,
          replay: isTest ? [] : session.replay,
          findings: isTest ? [] : session.findings,
          messages: [
            ...session.messages,
            {
              id: event.id,
              role: "assistant",
              timestamp: event.timestamp,
              content: event.content,
              kind: isTest ? "intro" : undefined,
            },
          ],
        };
      }
      case "session.control": {
        if (event.status === "paused" && session.status !== "running") return session;
        if (event.status === "running" && !["paused", "manual", "error"].includes(session.status)) return session;
        if (event.status === "manual" && session.status === "manual") return session;
        // Browsing is still useful before a test; returning from that manual
        // exploration must not silently launch an unrequested scenario.
        const status = event.status === "running" && session.run === 0 ? "idle" : event.status;
        const handback = session.status === "manual" && status === "running";
        return { ...session, status, error: null, messages: handback ? [...session.messages, {
          id: `${session.id}-handback-${session.messages.length}`, role: "assistant", timestamp: new Date().toISOString(),
          content: "Control returned. I’ll continue from your current demo state. The next scripted action will restore any checkout prerequisites it needs; your earlier snapshots are preserved.",
        }] : session.messages };
      }
      case "session.target":
        return activeStatuses.includes(session.status) && session.run > 0 ? session : { ...session, target: event.target };
      case "session.viewport":
        return { ...session, viewport: event.viewport };
      case "session.interrupt":
        return session.run > 0 && activeStatuses.includes(session.status)
          ? { ...session, status: "error", error: "The scripted demo was interrupted. Your progress is saved." } : session;
      case "browser.command":
        return (!event.sessionId || event.sessionId === session.id) && ["idle", "manual", "completed", "error"].includes(session.status)
          ? { ...session, browser: updateBrowser(session.browser, event.command) } : session;
      case "session.agent": {
        if (state.activeId !== session.id || session.run !== event.run || session.status !== "running") return session;
        const agentEvent = event.event;
        if (agentEvent.type === "agent.step") {
          if (agentEvent.cursor !== session.cursor + 1) return session;
          return { ...session, cursor: agentEvent.cursor, browser: agentEvent.browser, actions: [...session.actions, agentEvent.action], replay: [...session.replay, agentEvent.replay] };
        }
        if (agentEvent.type === "agent.failed") return { ...session, status: "error", error: agentEvent.message };
        return { ...session, status: "completed", findings: [agentEvent.finding], messages: [...session.messages, agentEvent.message] };
      }
    }
  });
  return { ...state, sessions };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isTimestamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((item) => typeof item === "string");
const isViewport = (v: unknown) => v === "desktop" || v === "mobile";

function isOrder(v: unknown): v is Order {
  return isRecord(v) && typeof v.id === "string" && typeof v.email === "string"
    && typeof v.total === "number" && Number.isFinite(v.total) && v.total >= 0
    && Number.isInteger(v.attempt) && (v.attempt as number) > 0;
}

function isBrowser(v: unknown): v is DemoStoreState {
  return isRecord(v) && ["products", "cart", "checkout", "confirmation"].includes(v.page as string)
    && typeof v.submitting === "boolean" && Number.isInteger(v.pendingSubmissions) && (v.pendingSubmissions as number) >= 0
    && Number.isInteger(v.attempt) && (v.attempt as number) > 0 && (v.error === null || typeof v.error === "string")
    && Array.isArray(v.cart) && v.cart.every((item) => isRecord(item) && ["tote", "mug", "lamp"].includes(item.productId as string)
      && Number.isInteger(item.quantity) && (item.quantity as number) > 0)
    && Array.isArray(v.orders) && v.orders.every(isOrder) && isRecord(v.customer)
    && ["name", "email", "address", "city", "zip"].every((key) => typeof (v.customer as Record<string, unknown>)[key] === "string");
}

function isMessage(v: unknown): v is Message {
  return isRecord(v) && typeof v.id === "string" && ["user", "assistant"].includes(v.role as string)
    && typeof v.content === "string" && isTimestamp(v.timestamp)
    && (v.kind === undefined || v.kind === "intro" || v.kind === "result");
}

function isAction(v: unknown): v is AgentAction {
  return isRecord(v) && typeof v.id === "string" && typeof v.label === "string" && typeof v.detail === "string"
    && isTimestamp(v.timestamp) && ["observe", "act", "verify"].includes(v.phase as string)
    && (v.target === undefined || ["product", "cart", "checkout", "customer", "submit", "confirmation"].includes(v.target as string));
}

function isFinding(v: unknown): v is Finding {
  return isRecord(v) && ["id", "title", "explanation", "expected", "actual", "replayStepId"].every((key) => typeof v[key] === "string")
    && ["high", "medium", "low"].includes(v.severity as string) && v.status === "confirmed"
    && isStringList(v.steps) && isStringList(v.relatedActionIds) && Array.isArray(v.evidence) && v.evidence.every(isOrder);
}

function isReplay(v: unknown): v is ReplayStep {
  return isRecord(v) && typeof v.id === "string" && isAction(v.action) && isViewport(v.viewport) && isBrowser(v.snapshot);
}

function isSession(s: unknown): s is Session {
  return isRecord(s) && typeof s.id === "string" && typeof s.title === "string" && isTimestamp(s.createdAt) && typeof s.sample === "boolean"
    && ["idle", "running", "paused", "manual", "completed", "error"].includes(s.status as string)
    && Number.isInteger(s.cursor) && (s.cursor as number) >= 0 && (s.cursor as number) <= 200
    && Number.isInteger(s.run) && (s.run as number) >= 0 && (s.error === null || typeof s.error === "string")
    && isRecord(s.target) && ["demo", "custom"].includes(s.target.kind as string) && typeof s.target.url === "string"
    && isViewport(s.viewport) && Array.isArray(s.messages) && s.messages.every(isMessage)
    && Array.isArray(s.actions) && s.actions.every(isAction) && s.actions.length === s.cursor
    && Array.isArray(s.findings) && s.findings.every(isFinding)
    && Array.isArray(s.replay) && s.replay.every(isReplay) && s.replay.length === s.cursor && isBrowser(s.browser);
}

export function isTestingIntent(content: string): boolean {
  const trimmed = content.trim();
  if (
    /https?:\/\/[^\s]+/i.test(trimmed) ||
    /\b(?:localhost|\d{1,3}(?:\.\d{1,3}){3}):\d+/i.test(trimmed) ||
    /\b[a-zA-Z0-9-]+\.(?:com|org|net|io|dev|app|ai|co|local|test)\b/i.test(trimmed)
  ) {
    return true;
  }
  return /\b(?:test|inspect|audit|check|verify|scan|crawl|explore|reproduce|debug|break|double[- ]submit|checkout flow|run|start)\b/i.test(trimmed);
}

export function getConversationalReply(content: string): string {
  const text = content.trim().toLowerCase();
  if (/\b(?:essay|poem|recipe|story)\b/i.test(text)) {
    return "I’m Glitch, an AI browser testing agent powered by Gemma. I focus on automated web QA and testing rather than creative writing. Supply a URL or tell me a flow you'd like to test!";
  }
  if (/^(?:hey|hi|hello|yo|howdy|good\s+(?:morning|afternoon|evening)|greetings|sup)\b/i.test(text)) {
    return "Hey! I’m Glitch, an autonomous AI browser testing agent powered by Gemma. Give me a URL to test (like `https://example.com` or `http://localhost:3000`) or ask me to check a user flow, and I’ll launch a browser to inspect the UI and catch bugs.";
  }
  if (/\b(?:what can you do|help|who are you|how does (?:it|this) work|capabilities|features)\b/i.test(text)) {
    return "I’m an AI browser testing agent that discovers bugs, race conditions, and visual flaws in web applications. Here’s what I can do:\n\n• **Live Browser Automation**: Give me any URL and I’ll navigate, click, inspect DOM trees, and fill inputs using Playwright.\n• **Edge Case Detection**: I test rapid double-submissions, validation errors, and state recovery.\n• **Evidence & Replay**: I capture step-by-step screenshots and reproduction reports.\n\nTo start, enter a URL or click one of the shortcut suggestions below!";
  }
  return "I’m here to help test your web applications! Whenever you’re ready, provide a URL (e.g., `https://your-app.com` or `http://localhost:3000`) or ask me to test a flow, and I’ll launch the browser to investigate.";
}

export function restoreWorkspace(raw: string | null): WorkspaceState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.sessions) || !value.sessions.length || value.sessions.length > 15) return null;
    if (!value.sessions.every(isSession)) return null;
    if (!value.sessions.some((s) => s.id === value.activeId)) return null;
    return { version: 1, activeId: value.activeId as string, sessions: value.sessions.map(pauseBackground) };
  } catch { return null; }
}

export function validateTarget(value: string): { url: string } | { error: string } {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
    return { url: url.href };
  } catch {
    return { error: "Enter a valid http:// or https:// URL without embedded credentials." };
  }
}

export function findingReport(session: Session, findingId: string) {
  const f = session.findings.find((finding) => finding.id === findingId);
  if (!f) return "";
  return [
    `# ${f.title}`, "", `Severity: ${f.severity.toUpperCase()} | Status: confirmed in scripted demo`,
    "Target actually tested: Demo Store (local React preview)",
    ...(session.target.kind === "custom" ? [`Requested URL (not connected): ${session.target.url}`] : []),
    "", f.explanation, "", `Expected: ${f.expected}`, `Actual: ${f.actual}`, "", "Reproduction:",
    ...f.steps.map((step, i) => `${i + 1}. ${step}`), "", "Synthetic demo evidence:",
    ...f.evidence.map((order) => `${order.id} | attempt ${order.attempt} | $${order.total.toFixed(2)} | ${order.email}`),
    "", "Related action timestamps:",
    ...session.actions.filter((a) => f.relatedActionIds.includes(a.id)).map((a) => `${a.timestamp} — ${a.label}`),
    "", "This is sample evidence from a scripted UI demonstration, not a finding against a live application.",
  ].join("\n");
}
