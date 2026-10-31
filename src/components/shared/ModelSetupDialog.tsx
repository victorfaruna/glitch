"use client";

import { useState, type RefObject } from "react";
import {
  Check,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import {
  DEFAULT_SYSTEM_INSTRUCTION,
  loadModelConfig,
  saveModelConfig,
  type ModelConfig,
} from "@/lib/glitch/model-config";
import "./session-dialogs.css";

interface ModelSetupDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onConfigChange?(config: ModelConfig): void;
}

export function ModelSetupDialog({
  dialogRef,
  onConfigChange,
}: ModelSetupDialogProps) {
  const [config, setConfig] = useState<ModelConfig>(loadModelConfig);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  function handleSave() {
    saveModelConfig(config);
    onConfigChange?.(config);
    dialogRef.current?.close();
  }

  function handleResetSystemPrompt() {
    setConfig((prev) => ({
      ...prev,
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    }));
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Ping: Verify model readiness" }],
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
          localEndpoint: config.localEndpoint,
          systemInstruction: config.systemInstruction,
        }),
      });

      if (!res.ok) {
        throw new Error(`Endpoint returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setTestResult({
        status: "success",
        message: data.modelUsed
          ? `Connected to ${data.modelUsed} successfully!`
          : "Model verified and ready for testing.",
      });
    } catch (err) {
      setTestResult({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to connect to model",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog
      dialogRef={dialogRef}
      titleId="model-setup-title"
      className="model-setup-dialog"
    >
      <DialogHeader
        id="model-setup-title"
        title="Model & System Prompt Setup"
        icon={<Sparkles className="text-accent size-5" />}
      />

      <div className="model-setup-content">
        <p className="model-setup-lead">
          Configure Google Gemma / Gemini API or your local endpoint, and customize the system prompt that directs Glitch&apos;s QA agent behavior.
        </p>

        {/* Provider selection */}
        <div className="model-setup-field">
          <label className="model-setup-label">Provider</label>
          <div className="model-provider-tabs">
            <button
              type="button"
              className={`model-provider-tab ${config.provider === "google" ? "active" : ""}`}
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  provider: "google",
                  model: prev.model.startsWith("gemma") ? "gemini-2.0-flash" : prev.model,
                }))
              }
            >
              <Sparkles size={14} />
              <span>Google Gen AI / Gemma Cloud</span>
            </button>
            <button
              type="button"
              className={`model-provider-tab ${config.provider === "local" ? "active" : ""}`}
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  provider: "local",
                  model: prev.model.startsWith("gemini") ? "gemma2" : prev.model,
                }))
              }
            >
              <Cpu size={14} />
              <span>Local Gemma (Ollama / vLLM)</span>
            </button>
          </div>
        </div>

        {/* Model selection */}
        <div className="model-setup-field">
          <label className="model-setup-label" htmlFor="model-name-select">
            Model Name
          </label>
          {config.provider === "google" ? (
            <select
              id="model-name-select"
              className="select select-bordered select-sm w-full model-setup-select"
              value={config.model}
              onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
            >
              <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended · Fast)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (In-depth analysis)</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                id="model-name-select"
                type="text"
                className="input input-bordered input-sm flex-1 model-setup-input"
                placeholder="gemma2, gemma2:9b, gemma2:27b"
                value={config.model}
                onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* Credentials / Endpoints */}
        {config.provider === "google" ? (
          <div className="model-setup-field">
            <div className="flex items-center justify-between">
              <label className="model-setup-label" htmlFor="api-key-input">
                Google AI Studio API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="model-setup-link"
              >
                Get a free key <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input
                id="api-key-input"
                type={showKey ? "text" : "password"}
                className="input input-bordered input-sm w-full pr-9 model-setup-input"
                placeholder="AIzaSy... (or set GEMINI_API_KEY in .env.local)"
                value={config.apiKey}
                onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-secondary"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="model-setup-field">
            <label className="model-setup-label" htmlFor="endpoint-input">
              Local Endpoint URL
            </label>
            <div className="relative">
              <input
                id="endpoint-input"
                type="url"
                className="input input-bordered input-sm w-full model-setup-input"
                placeholder="http://localhost:11434"
                value={config.localEndpoint}
                onChange={(e) => setConfig((prev) => ({ ...prev, localEndpoint: e.target.value }))}
              />
            </div>
            <span className="text-[10px] text-secondary/50 mt-1 block">
              Supports Ollama (<code>/api/chat</code>) or any OpenAI-compatible server (<code>/v1/chat/completions</code>).
            </span>
          </div>
        )}

        {/* System Prompt */}
        <div className="model-setup-field">
          <div className="flex items-center justify-between">
            <label className="model-setup-label" htmlFor="system-prompt-input">
              System Instruction / Persona Prompt
            </label>
            <button
              type="button"
              className="model-setup-reset-btn"
              onClick={handleResetSystemPrompt}
              title="Reset system prompt to default"
            >
              <RotateCcw size={11} /> Reset to Default
            </button>
          </div>
          <textarea
            id="system-prompt-input"
            className="textarea textarea-bordered model-setup-textarea"
            rows={6}
            value={config.systemInstruction}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, systemInstruction: e.target.value }))
            }
          />
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`model-test-banner ${testResult.status === "success" ? "is-success" : "is-error"}`}
          >
            {testResult.status === "success" ? <Check size={14} /> : <Globe size={14} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="model-setup-actions">
          <button
            type="button"
            className="btn btn-sm btn-ghost gap-1.5"
            disabled={testing}
            onClick={handleTestConnection}
          >
            {testing ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <Cpu size={13} />
            )}
            <span>Test Connection</span>
          </button>
          <div className="flex gap-2">
            <form method="dialog">
              <button className="btn btn-sm btn-ghost">Cancel</button>
            </form>
            <button
              type="button"
              className="btn btn-sm btn-accent gap-1.5"
              onClick={handleSave}
            >
              <Check size={14} />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
