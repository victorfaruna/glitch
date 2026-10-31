"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  Globe,
  Image as ImageIcon,
  Layers,
  LoaderCircle,
  Mail,
  Pause,
  Play,
  RotateCw,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { SCENARIO_LENGTH } from "@/lib/glitch/mock-agent";
import type { Session, WorkspaceEvent } from "@/lib/glitch/types";
import { getConversationalReply, isTestingIntent, validateTarget } from "@/lib/glitch/workspace-state";
import { loadModelConfig } from "@/lib/glitch/model-config";
import { elapsedTime } from "@/lib/utils/format-time";
import { Logo } from "@/components/layout/Logo";
import "./conversation.css";

const SHORTCUT_SETS = [
  [
    {
      icon: Mail,
      label: "Contact Form",
      prompt:
        "Test the contact and customer support form with edge case submissions.",
    },
    {
      icon: ImageIcon,
      label: "Image Editor",
      prompt:
        "Test media upload, image preview, and aspect ratio responsiveness.",
    },
    {
      icon: Gamepad2,
      label: "Mini Game",
      prompt:
        "Test interactive UI controls, rapid key presses, and state recovery.",
    },
    {
      icon: Activity,
      label: "Finance Calculator",
      prompt:
        "Test currency inputs, rounding errors, and boundary calculations.",
    },
  ],
  [
    {
      icon: ShoppingBag,
      label: "Checkout Flow",
      prompt:
        "Test the checkout flow. Try unusual inputs and check whether submitting twice creates duplicate orders.",
    },
    {
      icon: ShieldCheck,
      label: "Double Submit",
      prompt:
        "Test repeated submission on the order button while the first request is pending.",
    },
    {
      icon: Layers,
      label: "Cart & Inventory",
      prompt:
        "Test adding items to the cart, modifying quantities, and inspecting total calculations.",
    },
    {
      icon: Sparkles,
      label: "Edge Cases",
      prompt:
        "Explore edge case customer inputs, empty fields, and boundary values across checkout.",
    },
  ],
];

export function ConversationPanel({
  session,
  dispatch,
  openFindings,
  openBrowser,
  openModelSetup,
}: {
  session: Session;
  dispatch(event: WorkspaceEvent): void;
  openFindings(): void;
  openBrowser?: () => void;
  openModelSetup?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [modelConfig, setModelConfig] = useState(loadModelConfig);
  const [showAllActions, setShowAllActions] = useState(false);
  const [shortcutSetIndex, setShortcutSetIndex] = useState(0);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [customUrl, setCustomUrl] = useState(
    session.target.kind === "custom" ? session.target.url : "http://localhost:3000",
  );
  const [targetError, setTargetError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const running = session.status === "running";
  const currentAction = session.actions.at(-1);
  const actions = showAllActions ? session.actions : session.actions.slice(-4);
  const currentShortcuts = SHORTCUT_SETS[shortcutSetIndex];
  const introIndex = session.messages.findLastIndex(
    (message) => message.kind === "intro",
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowTargetDropdown(false);
      }
    }
    if (showTargetDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTargetDropdown]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container)
      container.scrollTo({
        top: container.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [session.messages.length, session.actions.length, showAllActions, isThinking]);

  async function send(content: string) {
    if (!content.trim() || running || isThinking) return;
    const now = new Date().toISOString();
    const userMessageId = crypto.randomUUID();

    // 1. Dispatch user message to conversation
    dispatch({
      type: "session.send",
      content,
      timestamp: now,
      id: userMessageId,
      reply: "", // do not synchronously inject template reply
    });
    setDraft("");
    setIsThinking(true);

    try {
      // 2. Query model via /api/chat with system prompt
      const currentConfig = loadModelConfig();
      setModelConfig(currentConfig);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...session.messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content },
          ],
          targetUrl: session.target.url,
          provider: currentConfig.provider,
          model: currentConfig.model,
          apiKey: currentConfig.apiKey,
          localEndpoint: currentConfig.localEndpoint,
          systemInstruction: currentConfig.systemInstruction,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error (${res.status})`);
      }

      const data = await res.json();
      const reply = data.reply || "I received your request.";
      const isTest = Boolean(data.isTest);

      let newTarget = session.target;
      if (data.targetUrl) {
        const validated = validateTarget(data.targetUrl);
        if ("url" in validated) {
          newTarget = { kind: "custom", url: validated.url };
        }
      }

      // 3. Dispatch model response
      dispatch({
        type: "session.reply",
        id: crypto.randomUUID(),
        content: reply,
        timestamp: new Date().toISOString(),
        isTest,
        target: newTarget,
      });

      // 4. Trigger browser panel if test intent was detected
      if (isTest) {
        openBrowser?.();
      }
    } catch {
      // Fallback if offline or network error
      const isTest = isTestingIntent(content);
      const reply = getConversationalReply(content);
      dispatch({
        type: "session.reply",
        id: crypto.randomUUID(),
        content: reply,
        timestamp: new Date().toISOString(),
        isTest,
      });
      if (isTest) {
        openBrowser?.();
      }
    } finally {
      setIsThinking(false);
      composerRef.current?.focus();
    }
  }

  function saveCustomTarget() {
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    const validated = validateTarget(trimmed);
    if ("error" in validated) {
      setTargetError(validated.error);
      return;
    }
    dispatch({
      type: "session.target",
      target: { kind: "custom", url: validated.url },
    });
    setCustomUrl(validated.url);
    setTargetError("");
    setShowTargetDropdown(false);
  }

  return (
    <section
      className={`conversation-panel ${session.messages.length === 0 ? "is-welcome" : ""}`}
      id="conversation-panel"
      aria-label="Agent conversation"
    >
      <div className="conversation-scroll" ref={scrollRef}>
        {session.messages.length > 0 && (
          <>
            <div
              className="message-list"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {session.messages.map((message, index) => (
                <div key={message.id}>
                  <article className={`conversation-message ${message.role}`}>
                    {message.role === "assistant" && (
                      <div className="message-author">
                        <Logo className="size-4 text-secondary" />
                        <span>Glitch</span>
                        {openModelSetup ? (
                          <button
                            type="button"
                            className="message-model hover:text-accent cursor-pointer transition-colors"
                            onClick={openModelSetup}
                            title="Configure model and system prompt"
                          >
                            {modelConfig.provider === "local" ? "Local Gemma" : modelConfig.model}
                          </button>
                        ) : (
                          <span className="message-model">
                            {modelConfig.provider === "local" ? "Local Gemma" : modelConfig.model}
                          </span>
                        )}
                      </div>
                    )}
                    <p>{message.content}</p>
                    {message.kind === "result" &&
                      session.findings.length > 0 && (
                        <button
                          type="button"
                          className="finding-message-link"
                          onClick={openFindings}
                        >
                          <span className="finding-dot" />
                          {session.findings.length} confirmed issue
                          <ArrowRight size={14} />
                        </button>
                      )}
                  </article>
                  {index === introIndex && session.actions.length > 0 && (
                    <div className="action-group">
                      <div className="action-group-title">
                        <span>
                          <ScanLine size={13} />{" "}
                          {session.target.kind === "custom"
                            ? "Live browser test"
                            : "Checkout test"}
                        </span>
                        <span>
                          {session.cursor}
                          {session.target.kind === "demo"
                            ? `/${SCENARIO_LENGTH}`
                            : ""}
                        </span>
                      </div>
                      {session.actions.length > 4 && (
                        <button
                          type="button"
                          className="show-actions"
                          aria-expanded={showAllActions}
                          onClick={() => setShowAllActions(!showAllActions)}
                        >
                          {showAllActions
                            ? "Show recent actions"
                            : `Show ${session.actions.length - 4} earlier actions`}
                          <ChevronDown
                            size={12}
                            className={showAllActions ? "rotate-180" : ""}
                          />
                        </button>
                      )}
                      {actions.map((action) => {
                        const active =
                          running && action.id === currentAction?.id;
                        return (
                          <div
                            className={`action-card ${active ? "action-active" : ""}`}
                            key={action.id}
                          >
                            <span className="action-state">
                              {active ? (
                                <LoaderCircle
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Check size={13} />
                              )}
                            </span>
                            <div>
                              <span>{action.label}</span>
                              <p>{action.detail}</p>
                            </div>
                            <time>
                              {elapsedTime(
                                action.timestamp,
                                session.actions[0].timestamp,
                              )}
                            </time>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {isThinking && (
                <article className="conversation-message assistant is-thinking">
                  <div className="message-author">
                    <Logo className="size-4 text-secondary animate-pulse" />
                    <span>Glitch</span>
                    <span className="message-model">Gemma</span>
                  </div>
                  <div className="thinking-bubble">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                  </div>
                </article>
              )}
            </div>
          </>
        )}
      </div>
      <div className="conversation-bottom">
        {session.messages.length === 0 && (
          <div className="convo-welcome-header">
            {openModelSetup ? (
              <button
                type="button"
                className="convo-welcome-badge hover:brightness-110 cursor-pointer transition-all"
                onClick={openModelSetup}
                title="Configure Gemma model & system prompt"
              >
                <Logo className="size-3 text-secondary" />
                <span>
                  Using <strong>{modelConfig.provider === "local" ? "Local Gemma" : `Google Gemma (${modelConfig.model})`}</strong>
                </span>
                <ChevronRight size={12} className="text-secondary/70" />
              </button>
            ) : (
              <div className="convo-welcome-badge">
                <Logo className="size-3 text-secondary" />
                <span>
                  Using Google&apos;s <strong>Gemma</strong> model
                </span>
                <ChevronRight size={12} className="text-secondary/70" />
              </div>
            )}
            <h1 className="convo-welcome-title">What do you want to test?</h1>
          </div>
        )}
        {(running ||
          session.status === "paused" ||
          (session.status === "manual" && session.run > 0)) && (
          <div className="run-progress">
            <div>
              <span>
                {running ? (
                  <LoaderCircle size={13} className="animate-spin" />
                ) : (
                  <Pause size={13} />
                )}
                {running
                  ? (currentAction?.label ?? (session.target.kind === "custom" ? "Glitch is testing application…" : "Starting checkout test…"))
                  : session.status === "manual"
                    ? "You have browser control"
                    : "Test paused"}
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() =>
                  dispatch({
                    type: "session.control",
                    status: running ? "paused" : "running",
                  })
                }
                aria-label={running ? "Pause test" : "Resume test"}
              >
                {running ? <Pause size={12} /> : <Play size={12} />}
              </button>
            </div>
            <progress
              className="progress progress-accent"
              value={session.cursor}
              max={session.target.kind === "demo" ? SCENARIO_LENGTH : Math.max(10, session.cursor + 2)}
              aria-label="Agent test progress"
            />
          </div>
        )}
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="agent-message" className="sr-only">
            Message Glitch
          </label>
          <textarea
            id="agent-message"
            ref={composerRef}
            className="textarea textarea-ghost"
            rows={3}
            value={draft}
            maxLength={4000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              isThinking
                ? "Glitch is thinking…"
                : running
                  ? "Glitch is testing. Pause to send a message…"
                  : "Ask Glitch to test..."
            }
            disabled={running || isThinking}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                send(draft);
              }
            }}
          />
          <div className="composer-tools">
            <div className="target-selector-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="target-selector-pill"
                onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                title="Change test target"
                aria-expanded={showTargetDropdown}
                disabled={running}
              >
                {session.target.kind === "custom" ? (
                  <>
                    <Globe size={12} />
                    <span className="target-pill-label">
                      {session.target.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={12} />
                    <span className="target-pill-label">Demo Store</span>
                  </>
                )}
                <ChevronDown size={11} className={showTargetDropdown ? "rotate-180" : ""} />
              </button>

              {showTargetDropdown && (
                <div className="target-dropdown-menu">
                  <div className="target-dropdown-header">Application Target</div>
                  <button
                    type="button"
                    className={`target-dropdown-item ${session.target.kind === "demo" ? "active" : ""}`}
                    onClick={() => {
                      dispatch({
                        type: "session.target",
                        target: { kind: "demo", url: "https://demo.glitch.local" },
                      });
                      setShowTargetDropdown(false);
                    }}
                  >
                    <ShoppingBag size={13} />
                    <div className="target-dropdown-item-text">
                      <strong>Demo Store</strong>
                      <span>Sample checkout & duplicate order scenario</span>
                    </div>
                    {session.target.kind === "demo" && <Check size={13} className="text-accent" />}
                  </button>

                  <div className="target-dropdown-divider" />

                  <div className="target-custom-form">
                    <div className="target-custom-header">
                      <Globe size={13} />
                      <strong>Custom Application URL</strong>
                    </div>
                    <div className="target-url-input-wrap">
                      <input
                        type="url"
                        className="input input-xs target-url-field"
                        placeholder="http://localhost:3000"
                        value={customUrl}
                        onChange={(e) => {
                          setCustomUrl(e.target.value);
                          setTargetError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveCustomTarget();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-xs btn-accent"
                        onClick={saveCustomTarget}
                      >
                        Set
                      </button>
                    </div>
                    {targetError && <p className="target-url-error">{targetError}</p>}
                    <span className="target-custom-note">
                      Runs live Playwright automation against your local server or URL.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-accent btn-sm btn-square send-button"
              disabled={running || isThinking || !draft.trim()}
              aria-label="Send message"
              title="Send message"
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </form>
        {session.messages.length === 0 && (
          <div className="prompt-suggestions">
            {currentShortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="suggestion-button"
                  onClick={() => {
                    send(item.prompt);
                  }}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="suggestion-button suggestion-refresh"
              aria-label="Cycle shortcut suggestions"
              title="Cycle shortcut suggestions"
              onClick={() =>
                setShortcutSetIndex((prev) => (prev + 1) % SHORTCUT_SETS.length)
              }
            >
              <RotateCw size={13} />
            </button>
          </div>
        )}
        <div className="composer-caption">
          {openModelSetup ? (
            <button
              type="button"
              className="hover:text-accent flex items-center gap-1.5 cursor-pointer transition-colors"
              onClick={openModelSetup}
              title="Configure model and system prompt"
            >
              <Sparkles size={11} className="text-accent" />
              <span>Model: {modelConfig.provider === "local" ? "Local Gemma" : modelConfig.model}</span>
            </button>
          ) : (
            <span>{session.target.kind === "custom" ? "Live Playwright agent · Autonomous QA" : "Scripted demo · Local preview"}</span>
          )}
          <span>
            <kbd>↵</kbd> to send
          </span>
        </div>
      </div>
    </section>
  );
}
