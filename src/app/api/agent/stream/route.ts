import { NextRequest } from "next/server";
import { AgentHarness, type AgentStreamEvent } from "@/lib/server/agent-harness";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUrl, prompt, model, apiKey, localEndpoint } = body || {};

    if (!targetUrl || typeof targetUrl !== "string") {
      return new Response(JSON.stringify({ error: "Missing required 'targetUrl'" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const abortController = new AbortController();
    req.signal.addEventListener("abort", () => {
      abortController.abort();
    });

    const harness = new AgentHarness();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: AgentStreamEvent) => {
          try {
            const payload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {
            // Controller might be closed if client disconnected
          }
        };

        try {
          await harness.run({
            targetUrl,
            prompt: prompt || "Explore the application and verify checkout, cart, and error handling.",
            model,
            apiKey,
            localEndpoint,
            signal: abortController.signal,
            onEvent: sendEvent,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          sendEvent({
            type: "error",
            error: message,
            timestamp: new Date().toISOString(),
          });
        } finally {
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
