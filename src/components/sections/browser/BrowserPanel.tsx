"use client";

import {
  ChevronLeft,
  CircleAlert,
  Globe,
  LockKeyhole,
  Monitor,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { storeAddress } from "@/lib/glitch/demo-store";
import type { Session, WorkspaceEvent } from "@/lib/glitch/types";
import { BrowserViewport } from "@/components/shared/BrowserViewport";
import { DemoStore } from "@/components/sections/demo-store/DemoStore";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import "./browser.css";

export function BrowserPanel({
  session,
  dispatch,
}: {
  session: Session;
  dispatch(event: WorkspaceEvent): void;
}) {
  const locked = session.status === "running" || session.status === "paused";
  const running = session.status === "running";
  const manual = session.status === "manual";
  const latest = session.actions.at(-1);
  const pages = {
    products: null,
    cart: "products",
    checkout: "cart",
    confirmation: "checkout",
  } as const;
  return (
    <div
      className="browser-panel"
      role="tabpanel"
      id="panel-browser"
      aria-label="Browser workspace"
    >
      <div className="browser-chrome">
        <div className="browser-navigation">
          <IconButton
            label="Go back in Demo Store"
            disabled={locked || !pages[session.browser.page]}
            onClick={() =>
              dispatch({
                type: "browser.command",
                command: {
                  type: "navigate",
                  page: pages[session.browser.page] ?? "products",
                },
              })
            }
          >
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton
            label="Reset Demo Store"
            disabled={locked}
            onClick={() =>
              dispatch({ type: "browser.command", command: { type: "reset" } })
            }
          >
            <RotateCcw size={14} />
          </IconButton>
        </div>
        <div className="browser-address">
          <LockKeyhole size={12} />
          <span>{session.target.kind === "custom" ? session.target.url : storeAddress(session.browser)}</span>
          <span className="browser-address-demo">{session.target.kind === "custom" ? "LIVE" : "DEMO"}</span>
        </div>
        <div
          className="viewport-controls"
          role="group"
          aria-label="Browser viewport"
        >
          <IconButton
            label="Desktop viewport"
            aria-pressed={session.viewport === "desktop"}
            className={session.viewport === "desktop" ? "selected" : ""}
            onClick={() =>
              dispatch({ type: "session.viewport", viewport: "desktop" })
            }
          >
            <Monitor size={15} />
          </IconButton>
          <IconButton
            label="Mobile viewport"
            aria-pressed={session.viewport === "mobile"}
            className={session.viewport === "mobile" ? "selected" : ""}
            onClick={() =>
              dispatch({ type: "session.viewport", viewport: "mobile" })
            }
          >
            <Smartphone size={15} />
          </IconButton>
        </div>
      </div>
      {session.target.kind === "custom" && (
        <div className="requested-target-note">
          <Globe size={13} />
          <span>
            Target: <span className="font-mono">{session.target.url}</span> ·
            Live browser automation engine
          </span>
        </div>
      )}
      <div
        className={`browser-agent-toolbar ${manual ? "manual-toolbar" : ""}`}
      >
        <div className="browser-toolbar-status">
          <StatusBadge status={session.status} />
          <span className="toolbar-description">
            {manual
              ? "You’re in the driver’s seat"
              : running
                ? "Glitch is interacting with the page"
                : session.status === "paused"
                  ? "Automation is paused"
                  : session.status === "completed"
                    ? "Demo test finished"
                    : "Interactive React preview"}
          </span>
        </div>
        <div className="browser-agent-controls">
          {running && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() =>
                dispatch({ type: "session.control", status: "paused" })
              }
            >
              <Pause size={12} />
              Pause
            </button>
          )}
          {session.status === "paused" && (
            <button
              className="btn btn-sm"
              onClick={() =>
                dispatch({ type: "session.control", status: "running" })
              }
            >
              <Play size={12} />
              Resume
            </button>
          )}
          {manual ? (
            <button
              className="btn btn-sm return-control"
              onClick={() =>
                dispatch({ type: "session.control", status: "running" })
              }
            >
              <Play size={12} />
              {session.run ? "Return to agent" : "Exit manual control"}
            </button>
          ) : (
            ["running", "paused"].includes(session.status) && (
              <button
                className="btn btn-sm"
                onClick={() =>
                  dispatch({ type: "session.control", status: "manual" })
                }
              >
                <MousePointer2 size={12} />
                Take control
              </button>
            )
          )}
        </div>
      </div>
      {session.status === "error" && (
        <div className="error-banner" role="alert">
          <CircleAlert size={17} />
          <div>
            <strong>Demo interrupted</strong>
            <span>{session.error} Retry continues at the next action.</span>
          </div>
          <button
            className="btn btn-sm"
            onClick={() =>
              dispatch({ type: "session.control", status: "running" })
            }
          >
            <RotateCcw size={12} />
            Retry
          </button>
        </div>
      )}
      <BrowserViewport
        viewport={session.viewport}
        highlight={running ? latest?.target : undefined}
        label={
          running
            ? latest?.label
            : manual
              ? "Manual control · interact with the store"
              : undefined
        }
      >
        {session.target.kind === "custom" ? (
          <div className="live-browser-display p-6 flex flex-col items-center justify-center min-h-[360px] text-center">
            <div className="max-w-md w-full bg-surface border border-line rounded-xl p-5 shadow-sm text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="badge badge-accent badge-sm font-semibold tracking-wider">
                  {latest?.phase ? latest.phase.toUpperCase() : "LIVE AGENT"}
                </span>
                <span className="text-[11px] text-text-muted">
                  {session.actions.length} action{session.actions.length === 1 ? "" : "s"}
                </span>
              </div>
              <h3 className="font-semibold text-sm text-secondary mb-1">
                {latest?.label ?? "Autonomous Browser Agent Ready"}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                {latest?.detail ?? `Target URL: ${session.target.url}. Testing execution driven by Playwright.`}
              </p>
              <div className="pt-3 border-t border-line flex items-center justify-between text-[10px] text-text-muted">
                <span>Target: {session.target.url}</span>
                <span>Step {session.cursor}</span>
              </div>
            </div>
          </div>
        ) : (
          <DemoStore
            store={session.browser}
            interactive={!locked}
            onCommand={(command) =>
              dispatch({ type: "browser.command", command })
            }
          />
        )}
      </BrowserViewport>
      <div className="browser-footer">
        <span>
          <span className="connection-dot" />
          {session.target.kind === "custom" ? (
            <>Target: <span className="font-mono">{session.target.url}</span></>
          ) : (
            <>Demo Store<span className="browser-footer-divider">/</span>Local simulation</>
          )}
        </span>
        <span>
          {session.viewport === "mobile" ? "390 px" : "Responsive"}
          <span className="browser-footer-divider">·</span>
          {session.target.kind === "custom" ? "Playwright Engine Active" : "No remote browser connected"}
        </span>
      </div>
    </div>
  );
}
