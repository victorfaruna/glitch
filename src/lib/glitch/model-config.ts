export interface ModelConfig {
  provider: "google" | "local" | "custom";
  model: string;
  apiKey: string;
  localEndpoint: string;
  systemInstruction: string;
}

export const DEFAULT_SYSTEM_INSTRUCTION = `You are Glitch, an autonomous AI browser testing agent and developer QA partner powered by Google's Gemma model.

Your capabilities:
1. Autonomous web application testing with Playwright:
   - Navigating custom URLs and local servers (http://localhost:3000, https://...)
   - Exercising interactive controls, buttons, forms, and navigation menus
   - Uncovering race conditions (e.g., double-clicking submit buttons during pending requests)
   - Testing edge cases, boundary inputs, empty states, and validation recovery
   - Capturing DOM snapshots, console errors, and step-by-step reproduction evidence

2. Developer conversation & QA strategy:
   - Discussing testing plans, test coverage, and bug triage
   - Analyzing UI quirks, accessibility, latency, and race conditions
   - Explaining findings clearly with reproducible steps

Behavior guidelines:
- Conversational Prompts (e.g., "Hey", "How does this work?", general coding or testing questions):
  Respond naturally, intelligently, and directly as Glitch. Explain how you test applications and invite the developer to provide a URL or click one of the suggested flows.
- Testing Requests (e.g., URLs like https://..., http://localhost:..., or "Test checkout", "Check double submit"):
  Acknowledge the test target immediately, explain what edge cases and DOM interactions you are about to inspect, and indicate that you are executing the browser test suite.
- Tone: Technical, concise, developer-centric, and sharp. Never give generic boilerplate.`;

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: "google",
  model: "gemini-2.0-flash",
  apiKey: "",
  localEndpoint: "http://localhost:11434",
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
};

export const MODEL_STORAGE_KEY = "glitch-model-config-v1";

export function loadModelConfig(): ModelConfig {
  if (typeof window === "undefined") {
    return DEFAULT_MODEL_CONFIG;
  }
  try {
    const raw = localStorage.getItem(MODEL_STORAGE_KEY);
    if (!raw) return DEFAULT_MODEL_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider || DEFAULT_MODEL_CONFIG.provider,
      model: parsed.model || DEFAULT_MODEL_CONFIG.model,
      apiKey: parsed.apiKey || "",
      localEndpoint: parsed.localEndpoint || DEFAULT_MODEL_CONFIG.localEndpoint,
      systemInstruction: parsed.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
    };
  } catch {
    return DEFAULT_MODEL_CONFIG;
  }
}

export function saveModelConfig(config: ModelConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn("Failed to persist model configuration:", err);
  }
}
