"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Film,
  LockKeyhole,
  Play,
  ScanLine,
} from "lucide-react";
import { storeAddress } from "@/lib/glitch/demo-store";
import type { Session } from "@/lib/glitch/types";
import { BrowserViewport } from "@/components/shared/BrowserViewport";
import { DemoStore } from "@/components/sections/demo-store/DemoStore";
import { elapsedTime } from "@/lib/utils/format-time";
import { IconButton } from "@/components/ui/IconButton";
import "@/components/shared/shared.css";
import "./replay.css";

export function ReplayPanel({
  session,
  index,
  onIndex,
  startDemo,
}: {
  session: Session;
  index: number;
  onIndex(index: number): void;
  startDemo(): void;
}) {
  const step = session.replay[Math.min(index, session.replay.length - 1)];
  if (!step)
    return (
      <section
        className="workspace-empty-state"
        role="tabpanel"
        id="panel-replay"
        aria-label="Replay"
      >
        <div className="empty-state-symbol">
          <Film size={29} />
        </div>
        <span className="eyebrow">EVERY ACTION, IN CONTEXT</span>
        <h2>A test you can walk through.</h2>
        <p>
          As Glitch explores the demo, each action gets a snapshot. Step
          backward, inspect a change, and see exactly how a finding happened.
        </p>
        <button
          className="btn btn-sm"
          disabled={["running", "paused", "manual"].includes(session.status)}
          onClick={startDemo}
        >
          <Play size={13} />
          Run checkout demo
          <ArrowRight size={13} />
        </button>
        <div className="empty-state-note">
          Demo replay uses local state snapshots, not remote browser recordings.
        </div>
      </section>
    );
  const selectedIndex = session.replay.indexOf(step);
  return (
    <section
      className="replay-panel"
      role="tabpanel"
      id="panel-replay"
      aria-label="Demo replay"
    >
      <div className="replay-heading">
        <div>
          <Film size={16} />
          <strong>Session replay</strong>
          <span className="badge badge-ghost badge-sm">Demo snapshots</span>
        </div>
        <div>
          <IconButton
            label="Previous replay step"
            disabled={selectedIndex === 0}
            onClick={() => onIndex(selectedIndex - 1)}
          >
            <ChevronLeft size={15} />
          </IconButton>
          <span className="replay-step-count">
            {String(selectedIndex + 1).padStart(2, "0")}
            <span> / {session.replay.length}</span>
          </span>
          <IconButton
            label="Next replay step"
            disabled={selectedIndex === session.replay.length - 1}
            onClick={() => onIndex(selectedIndex + 1)}
          >
            <ChevronRight size={15} />
          </IconButton>
        </div>
      </div>
      <div className="replay-layout">
        <nav className="replay-timeline" aria-label="Replay action timeline">
          <div className="replay-timeline-heading">
            <ScanLine size={12} /> ACTION TIMELINE
          </div>
          {session.replay.map((item, itemIndex) => (
            <button
              type="button"
              key={item.id}
              className={`replay-timeline-step ${selectedIndex === itemIndex ? "replay-step-selected" : ""}`}
              onClick={() => onIndex(itemIndex)}
              aria-current={selectedIndex === itemIndex ? "step" : undefined}
            >
              <span className="timeline-step-number">
                {String(itemIndex + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>{item.action.label}</strong>
                <time>
                  {elapsedTime(
                    item.action.timestamp,
                    session.replay[0].action.timestamp,
                  )}
                </time>
              </span>
              {selectedIndex === itemIndex && <ChevronRight size={12} />}
            </button>
          ))}
        </nav>
        <div className="replay-main">
          <div className="replay-address">
            <LockKeyhole size={11} />
            <span>{storeAddress(step.snapshot)}</span>
            <span>READ-ONLY SNAPSHOT</span>
          </div>
          <BrowserViewport
            viewport={step.viewport}
            highlight={step.action.target}
            readOnly
          >
            <DemoStore store={step.snapshot} interactive={false} />
          </BrowserViewport>
          <div className="replay-step-description">
            <div>
              <span className="replay-description-number">
                {String(selectedIndex + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{step.action.label}</h3>
                <p>{step.action.detail}</p>
              </div>
            </div>
            <div className="replay-bottom-controls">
              <button
                className="btn btn-sm btn-ghost"
                disabled={selectedIndex === 0}
                onClick={() => onIndex(selectedIndex - 1)}
              >
                <ArrowLeft size={13} />
                Previous
              </button>
              <button
                className="btn btn-sm"
                disabled={selectedIndex === session.replay.length - 1}
                onClick={() => onIndex(selectedIndex + 1)}
              >
                Next step
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
