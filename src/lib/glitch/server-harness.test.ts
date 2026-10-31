import test from "node:test";
import assert from "node:assert/strict";
import { BROWSER_TOOL_DECLARATIONS } from "../server/browser-tools";
import { getSystemBrowserPath } from "../server/browser-manager";
import { createLiveAgentAdapter } from "./live-agent-adapter";
import { initialWorkspace } from "./workspace-state";

test("browser tool declarations include core QA agent capabilities", () => {
  const toolNames = BROWSER_TOOL_DECLARATIONS.map((t) => t.name);
  assert.ok(toolNames.includes("navigate"), "Should include navigate tool");
  assert.ok(toolNames.includes("click"), "Should include click tool");
  assert.ok(toolNames.includes("type_text"), "Should include type_text tool");
  assert.ok(toolNames.includes("inspect_dom"), "Should include inspect_dom tool");
  assert.ok(toolNames.includes("take_screenshot"), "Should include take_screenshot tool");
  assert.ok(toolNames.includes("report_finding"), "Should include report_finding tool");
  assert.ok(toolNames.includes("finish_test"), "Should include finish_test tool");
});

test("system browser discovery detects installed browser binary", () => {
  const browserPath = getSystemBrowserPath();
  assert.ok(typeof browserPath === "string" || browserPath === undefined);
  if (browserPath) {
    assert.match(browserPath, /Chrome|Chromium|Brave|Edge/i);
  }
});

test("live agent adapter satisfies AgentAdapter interface and handles lifecycle", () => {
  const ws = initialWorkspace();
  const session = ws.sessions[0];
  const events: unknown[] = [];

  const adapter = createLiveAgentAdapter({
    getSession: () => session,
    emit: (event) => events.push(event),
    targetUrl: "http://localhost:3000",
    prompt: "Test checkout",
  });

  assert.equal(typeof adapter.start, "function");
  assert.equal(typeof adapter.pause, "function");
  assert.equal(typeof adapter.resume, "function");
  assert.equal(typeof adapter.cancel, "function");

  // Lifecycle calls should not throw
  adapter.pause();
  adapter.cancel();
});
