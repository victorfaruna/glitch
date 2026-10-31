"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createMockAgent } from "./mock-agent";
import { createLiveAgentAdapter } from "./live-agent-adapter";
import { initialWorkspace, restoreWorkspace, STORAGE_KEY, workspaceReducer } from "./workspace-state";
import type { WorkspaceEvent, WorkspaceState } from "./types";

const serverSnapshot = initialWorkspace();
let state: WorkspaceState = serverSnapshot;
let initialized = false;
let persistenceWarning = false;
const listeners = new Set<() => void>();

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try { state = restoreWorkspace(localStorage.getItem(STORAGE_KEY)) ?? serverSnapshot; }
  catch { persistenceWarning = true; }
}

function subscribe(listener: () => void) {
  initialize();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function sendWorkspaceEvent(event: WorkspaceEvent) {
  initialize();
  state = workspaceReducer(state, event);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { persistenceWarning = true; }
  listeners.forEach((listener) => listener());
}

export function useWorkspace() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
  const session = snapshot.sessions.find((s) => s.id === snapshot.activeId) ?? snapshot.sessions[0];
  const { id, status, run } = session;

  useEffect(() => {
    if (status !== "running") return;
    const currentSession = state.sessions.find((s) => s.id === id);
    if (!currentSession) return;

    const isSample = currentSession.sample;
    const targetUrl = currentSession.target?.kind === "custom"
      ? currentSession.target.url
      : typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    const lastUserMessage = [...currentSession.messages].reverse().find((m) => m.role === "user");

    const adapter = isSample
      ? createMockAgent({
          getSession: () => state.sessions.find((s) => s.id === id)!,
          emit: (event) => sendWorkspaceEvent({ type: "session.agent", sessionId: id, run, event }),
        })
      : createLiveAgentAdapter({
          getSession: () => state.sessions.find((s) => s.id === id)!,
          emit: (event) => sendWorkspaceEvent({ type: "session.agent", sessionId: id, run, event }),
          targetUrl,
          prompt: lastUserMessage?.content,
        });

    adapter.start();
    return () => adapter.cancel();
  }, [id, status, run]);

  useEffect(() => {
    if (!["idle", "manual", "completed", "error"].includes(session.status) || !session.browser.submitting) return;
    const timer = setTimeout(() => sendWorkspaceEvent({ type: "browser.command", sessionId: session.id, command: { type: "settle" } }), 1400);
    return () => clearTimeout(timer);
  }, [session.id, session.status, session.browser.submitting]);

  return { state: snapshot, session, dispatch: sendWorkspaceEvent, persistenceWarning };
}
