"use client";

import { useState } from "react";
import { ArrowRight, Check, Globe, ShoppingBag } from "lucide-react";
import type { Session, WorkspaceEvent } from "@/lib/glitch/types";
import { validateTarget } from "@/lib/glitch/workspace-state";
import "./conversation.css";

export function TargetSelector({
  session,
  dispatch,
  openBrowser,
}: {
  session: Session;
  dispatch(event: WorkspaceEvent): void;
  openBrowser(): void;
}) {
  const [mode, setMode] = useState(session.target.kind);
  const [url, setUrl] = useState(
    session.target.kind === "custom" ? session.target.url : "",
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const disabled =
    session.run > 0 && ["running", "paused", "manual"].includes(session.status);
  return (
    <div className="target-selector">
      <div className="target-heading">
        <span>APPLICATION</span>
        <span className="local-label">
          <span /> Local preview
        </span>
      </div>
      <div className="target-control">
        <span className="target-icon">
          <ShoppingBag size={17} />
        </span>
        <select
          aria-label="Target application"
          className="select select-ghost select-sm"
          value={mode}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value as "demo" | "custom";
            setMode(next);
            setError("");
            setSaved(false);
            if (next === "demo")
              dispatch({
                type: "session.target",
                target: { kind: "demo", url: "https://demo.glitch.local" },
              });
          }}
        >
          <option value="demo">Demo Store</option>
          <option value="custom">Custom application URL</option>
        </select>
        {mode === "demo" && (
          <span className="badge badge-sm badge-ghost">Sample app</span>
        )}
      </div>
      {mode === "custom" && (
        <form
          className="custom-target"
          onSubmit={(event) => {
            event.preventDefault();
            const result = validateTarget(url);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            setError("");
            setSaved(true);
            setUrl(result.url);
            dispatch({
              type: "session.target",
              target: { kind: "custom", url: result.url },
            });
          }}
        >
          <label htmlFor="custom-url" className="sr-only">
            Application URL
          </label>
          <div className="url-entry">
            <Globe size={14} />
            <input
              id="custom-url"
              className="input input-sm"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="https://your-app.com"
              value={url}
              disabled={disabled}
              onChange={(e) => {
                setUrl(e.target.value);
                setSaved(false);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "url-error" : "url-help"}
            />
            <button className="btn btn-sm" disabled={disabled || !url.trim()}>
              {saved ? <Check size={14} /> : "Save"}
            </button>
          </div>
          {error && (
            <p id="url-error" className="field-error" role="alert">
              {error}
            </p>
          )}
          <p id="url-help">
            {saved || session.target.kind === "custom" ? "URL saved. " : ""}Live
            connections are not available yet. The working preview and scripted
            tests use <strong>Demo Store</strong>.
          </p>
          <button
            type="button"
            className="btn btn-xs btn-ghost demo-preview-link"
            onClick={openBrowser}
          >
            Use Demo Store preview
            <ArrowRight size={11} />
          </button>
        </form>
      )}
    </div>
  );
}
