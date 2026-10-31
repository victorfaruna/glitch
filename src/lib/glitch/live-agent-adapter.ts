import type { AgentAdapter, AgentEvent, Finding, Session } from "./types";
import type { AgentStreamEvent } from "@/lib/server/agent-harness";

export interface LiveAgentOptions {
  getSession: () => Session;
  emit: (event: AgentEvent) => void;
  targetUrl?: string;
  prompt?: string;
  model?: string;
  apiKey?: string;
  localEndpoint?: string;
}

/**
 * Live agent adapter that connects to /api/agent/stream and drives
 * real-time Playwright tool calling and Gemma inference.
 */
export function createLiveAgentAdapter(options: LiveAgentOptions): AgentAdapter {
  const { getSession, emit } = options;
  let abortController: AbortController | null = null;
  let active = false;
  let cancelled = false;

  async function connectAndStream() {
    if (cancelled || !active) return;

    abortController = new AbortController();
    const session = getSession();
    let targetUrl = options.targetUrl || session.target.url || "http://localhost:3000";
    if (targetUrl === "https://demo.glitch.local" && typeof window !== "undefined") {
      targetUrl = window.location.origin;
    }
    const lastUserMessage = [...session.messages].reverse().find((m) => m.role === "user");
    const prompt = options.prompt || lastUserMessage?.content || "Explore and test the application.";

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          prompt,
          model: options.model,
          apiKey: options.apiKey,
          localEndpoint: options.localEndpoint,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Agent server error (${response.status}): ${await response.text()}`);
      }

      if (!response.body) {
        throw new Error("No readable stream received from /api/agent/stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      let collectedFinding: Finding | null = null;
      let finalSummary = "";

      while (active && !cancelled) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const match = block.match(/^data:\s*(.+)$/m);
          if (!match) continue;

          try {
            const event: AgentStreamEvent = JSON.parse(match[1]);

            switch (event.type) {
              case "action": {
                const currentSession = getSession();
                const actionObj = {
                  id: event.action.id,
                  label: event.action.label,
                  detail: event.action.detail,
                  timestamp: event.action.timestamp,
                  phase: event.action.phase,
                };
                emit({
                  type: "agent.step",
                  action: actionObj,
                  browser: currentSession.browser,
                  cursor: currentSession.cursor + 1,
                  replay: {
                    id: actionObj.id,
                    action: actionObj,
                    snapshot: currentSession.browser,
                    viewport: currentSession.viewport,
                  },
                });
                break;
              }

              case "finding": {
                collectedFinding = event.finding;
                break;
              }

              case "result": {
                finalSummary = event.summary;
                break;
              }

              case "error": {
                emit({
                  type: "agent.failed",
                  message: `Agent execution failed: ${event.error}`,
                });
                break;
              }

              default:
                break;
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }

      if (active && !cancelled) {
        const currentSession = getSession();
        const finding: Finding = collectedFinding || {
          id: `${currentSession.id}-finding-${currentSession.run}`,
          title: "Browser AI testing completed",
          severity: "medium",
          status: "confirmed",
          explanation: finalSummary || "Autonomous testing scan finished.",
          expected: "Expected flow without uncaught errors.",
          actual: "Observed live browser state during Playwright session.",
          steps: ["Navigate to application", "Run agentic browser exploration", "Review outcomes"],
          evidence: currentSession.browser.orders,
          relatedActionIds: currentSession.actions.map((a) => a.id),
          replayStepId: currentSession.actions[0]?.id || "",
        };

        emit({
          type: "agent.completed",
          finding,
          message: {
            id: `${currentSession.id}-result-${currentSession.run}`,
            role: "assistant",
            kind: "result",
            timestamp: new Date().toISOString(),
            content: finalSummary || "I finished testing the target application with live browser automation and recorded the findings.",
          },
        });
      }
    } catch (err) {
      if (!cancelled && active) {
        const message = err instanceof Error ? err.message : String(err);
        emit({
          type: "agent.failed",
          message: `Live agent stream disconnected: ${message}`,
        });
      }
    } finally {
      active = false;
    }
  }

  function pause() {
    active = false;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  function resume() {
    if (cancelled) return;
    active = true;
    connectAndStream();
  }

  return {
    start: resume,
    resume,
    pause,
    cancel() {
      pause();
      cancelled = true;
    },
  };
}
