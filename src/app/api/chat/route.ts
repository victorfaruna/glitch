import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_SYSTEM_INSTRUCTION } from "@/lib/glitch/model-config";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      targetUrl,
      provider = "google",
      model,
      apiKey: userApiKey,
      localEndpoint: userLocalEndpoint,
      systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
    } = body || {};

    const lastMessage: ChatMessage | undefined = messages.at(-1);
    const userPrompt = lastMessage?.content?.trim() || "";

    // Determine testing intent and extract any URL
    const urlMatch =
      userPrompt.match(/https?:\/\/[^\s]+/i) ||
      userPrompt.match(/\b(?:localhost|\d{1,3}(?:\.\d{1,3}){3}):\d+[^\s]*/i);
    const extractedUrl = urlMatch
      ? urlMatch[0].startsWith("http")
        ? urlMatch[0]
        : `http://${urlMatch[0]}`
      : targetUrl || null;

    const isTest = Boolean(
      urlMatch ||
        /\b(?:test|inspect|audit|check|verify|scan|crawl|explore|reproduce|debug|break|double[- ]submit|checkout flow)\b/i.test(
          userPrompt
        )
    );

    const apiKey =
      userApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;
    const localEndpoint =
      userLocalEndpoint ||
      process.env.LOCAL_GEMMA_ENDPOINT ||
      "http://localhost:11434";

    let reply = "";
    let modelUsed = "";

    // 1. Google Gemini / Gemma Cloud
    if (provider === "google" && apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const modelName = model || "gemini-2.0-flash";
        modelUsed = `Google ${modelName}`;

        const formattedContents = messages.map((m: ChatMessage) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const response = await ai.models.generateContent({
          model: modelName,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 600,
          },
          contents: formattedContents,
        });

        reply = response.text || "";
      } catch (genAiErr) {
        console.warn("GoogleGenAI chat call failed:", genAiErr);
      }
    }

    // 2. Local Gemma (Ollama, vLLM, or LM Studio)
    if (!reply && (provider === "local" || (!apiKey && userLocalEndpoint))) {
      try {
        const base = localEndpoint.replace(/\/$/, "");
        const modelName = model || "gemma2";

        // Try Ollama native chat endpoint
        const res = await fetch(`${base}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemInstruction },
              ...messages,
            ],
            stream: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          reply = data.message?.content || "";
          modelUsed = `Local ${modelName} (Ollama)`;
        } else {
          // Fallback to OpenAI-compatible endpoint
          const oaiRes = await fetch(`${base}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: "system", content: systemInstruction },
                ...messages,
              ],
              temperature: 0.7,
              stream: false,
            }),
          });
          if (oaiRes.ok) {
            const oaiData = await oaiRes.json();
            reply = oaiData.choices?.[0]?.message?.content || "";
            modelUsed = `Local ${modelName} (OpenAI-compatible)`;
          }
        }
      } catch (localErr) {
        console.warn("Local Gemma chat call failed:", localErr);
      }
    }

    // 3. Fallback when neither cloud API key nor local endpoint responded
    if (!reply) {
      if (isTest && extractedUrl) {
        reply = `I’m launching the AI browser testing agent on **${extractedUrl}** for: "${userPrompt}". I’ll inspect the DOM structure, exercise interactive controls, probe for rapid click race conditions, and document all findings.`;
      } else if (isTest) {
        reply = `I’m launching the browser agent to test: "${userPrompt}". I’ll explore the application flow, verify input validation and state recovery, and record any issues found.`;
      } else {
        reply = generateFallbackConversationalReply(userPrompt, apiKey, localEndpoint);
      }
    }

    return Response.json({
      reply,
      isTest,
      targetUrl: extractedUrl,
      modelUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

function generateFallbackConversationalReply(
  prompt: string,
  hasKey: string | undefined,
  endpoint: string
): string {
  const text = prompt.toLowerCase();

  if (/^(?:hey|hi|hello|yo|howdy|good\s+(?:morning|afternoon|evening)|greetings|sup)\b/i.test(text)) {
    return "Hey! I’m Glitch, an autonomous AI browser testing agent powered by Google's Gemma model. What web application are we testing today? You can share a URL (e.g., `https://your-app.com` or `http://localhost:3000`) or choose one of the shortcuts below to watch me test in real time.";
  }

  if (/\b(?:what can you do|help|who are you|how does (?:it|this) work|capabilities|features)\b/i.test(text)) {
    return "I autonomously test web applications in a live browser session using Playwright and Gemma reasoning. Here’s what I can do:\n\n• **Real Browser Automation**: I navigate, click, fill forms, and inspect rendered DOM trees.\n• **Edge Case & Race Condition Discovery**: I probe repeated submissions, boundary inputs, and network latency bugs.\n• **Action Logs & Evidence**: Every step is recorded with screenshots and reproducible steps.\n\nTo begin, share a URL or tell me a flow you'd like me to investigate!";
  }

  if (!hasKey) {
    return `I received: "${prompt}".\n\nI’m configured to reason with Google Gemma via the system prompt. To connect live model inference, click **Model Setup** in the top bar or badge to add your free Google AI Studio API key or connect a local Gemma instance (${endpoint}).\n\nWhenever you’re ready to test, supply any URL or test flow and I’ll launch the browser testing agent!`;
  }

  return `I understand: "${prompt}". Tell me which web application or URL you’d like me to test, and I’ll start the browser session to explore it.`;
}
