"use client";

import { useState, type RefObject } from "react";
import {
  ArrowRight,
  ChevronRight,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import type { Session } from "@/lib/glitch/types";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { StatusBadge } from "./StatusBadge";
import "./session-dialogs.css";

interface SessionHistoryDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  sessions: Session[];
  activeId: string;
  onSelect(id: string): void;
  onNewSession(): void;
}

export function SessionHistoryDialog({
  dialogRef,
  sessions,
  activeId,
  onSelect,
  onNewSession,
}: SessionHistoryDialogProps) {
  const [search, setSearch] = useState("");
  const filtered = sessions.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Dialog
      dialogRef={dialogRef}
      titleId="history-title"
      className="history-dialog"
    >
      <DialogHeader
        id="history-title"
        title="Session history"
        eyebrow="YOUR WORKSPACE"
      />
      <p className="dialog-description">
        Pick up where you left off. Sessions stay in this browser.
      </p>
      <label className="input history-search">
        <Search size={15} />
        <input
          type="search"
          placeholder="Find a session…"
          aria-label="Search session history"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="session-history-list">
        {filtered.map((item) => (
          <button
            type="button"
            className={`session-history-item ${item.id === activeId ? "session-history-active" : ""}`}
            key={item.id}
            onClick={() => {
              onSelect(item.id);
              dialogRef.current?.close();
            }}
          >
            <span className="history-session-icon">
              <MessageSquare size={17} />
            </span>
            <span>
              <span className="history-session-title">
                {item.title}
                {item.sample && (
                  <span className="badge badge-xs badge-ghost">Sample</span>
                )}
              </span>
              <span className="history-session-meta">
                <StatusBadge status={item.status} compact />
                <span>·</span>
                <span>
                  {item.findings.length}{" "}
                  {item.findings.length === 1 ? "finding" : "findings"}
                </span>
              </span>
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="history-no-results">No sessions match “{search}”.</p>
        )}
      </div>
      <button
        type="button"
        className="btn new-session-dialog-button"
        onClick={() => {
          onNewSession();
          dialogRef.current?.close();
        }}
      >
        <Plus size={15} />
        Start a new session
        <ArrowRight size={14} />
      </button>
      <p className="history-footnote">
        Switching sessions pauses an active test. Sample sessions are pre-filled
        demo data.
      </p>
    </Dialog>
  );
}
