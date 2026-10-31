"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MobilePaneSwitch } from "@/components/layout/MobilePaneSwitch";
import { NavigationRail } from "@/components/layout/NavigationRail";
import { PanelResizer } from "@/components/layout/PanelResizer";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { BrowserPanel } from "@/components/sections/browser/BrowserPanel";
import { ConversationPanel } from "@/components/sections/conversation/ConversationPanel";
import { FindingsPanel } from "@/components/sections/findings/FindingsPanel";
import { ReplayPanel } from "@/components/sections/replay/ReplayPanel";
import { DemoInfoDialog } from "@/components/shared/DemoInfoDialog";
import { ModelSetupDialog } from "@/components/shared/ModelSetupDialog";
import { SessionHistoryDialog } from "@/components/shared/SessionHistoryDialog";
import { useWorkspace } from "@/lib/glitch/use-workspace";
import type { WorkspaceTab } from "@/lib/glitch/types";
import { WorkspaceTabs } from "./WorkspaceTabs";

interface PanelView {
  sessionId: string;
  run: number;
  open: boolean;
  tab: WorkspaceTab;
  mobilePane: "chat" | "workspace";
}

export function GlitchWorkspace() {
  const { state, session, dispatch, persistenceWarning } = useWorkspace();
  const [panelView, setPanelView] = useState<PanelView | null>(null);
  const [conversationWidth, setConversationWidth] = useState(33);
  const [replayIndex, setReplayIndex] = useState(0);
  const [findingId, setFindingId] = useState<string | null>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const aboutRef = useRef<HTMLDialogElement>(null);
  const modelSetupRef = useRef<HTMLDialogElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);

  // A new accepted test increments run. Only that change resets the panel
  // defaults; agent actions and ordinary chat messages preserve the user's view.
  const view: PanelView =
    panelView?.sessionId === session.id && panelView.run === session.run
      ? panelView
      : {
          sessionId: session.id,
          run: session.run,
          open: session.run > 0,
          tab: "browser",
          mobilePane: session.run > 0 ? "workspace" : "chat",
        };
  const { open: workspaceOpen, tab, mobilePane } = view;
  const wasWorkspaceOpen = useRef(workspaceOpen);

  useEffect(() => {
    if (wasWorkspaceOpen.current && !workspaceOpen) {
      document.getElementById("agent-message")?.focus();
    }
    wasWorkspaceOpen.current = workspaceOpen;
  }, [workspaceOpen]);

  function resetPanels() {
    setPanelView(null);
    setReplayIndex(0);
    setFindingId(null);
  }
  function newSession() {
    dispatch({
      type: "session.new",
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
    resetPanels();
  }
  function selectSession(id: string) {
    dispatch({ type: "session.select", id });
    resetPanels();
  }
  function openTab(next: WorkspaceTab) {
    setPanelView({ ...view, open: true, tab: next, mobilePane: "workspace" });
  }
  function closeWorkspace() {
    setPanelView({ ...view, open: false, mobilePane: "chat" });
  }
  function startDemo() {
    dispatch({
      type: "session.send",
      content: "Test the checkout flow.",
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
    openTab("browser");
  }
  function openReplay(stepId: string) {
    setReplayIndex(
      Math.max(
        0,
        session.replay.findIndex((step) => step.id === stepId),
      ),
    );
    openTab("replay");
  }

  return (
    <WorkspaceShell
      mobilePane={mobilePane}
      persistenceWarning={persistenceWarning}
      onFocusComposer={() => setPanelView({ ...view, mobilePane: "chat" })}
      header={
        <WorkspaceHeader
          title={session.title}
          onNewSession={newSession}
          onModelSetup={() => modelSetupRef.current?.showModal()}
        />
      }
      navigation={
        <NavigationRail
          workspaceOpen={workspaceOpen}
          onNewSession={newSession}
          onBrowser={() => openTab("browser")}
          onHistory={() => historyRef.current?.showModal()}
          onAbout={() => aboutRef.current?.showModal()}
          onModelSetup={() => modelSetupRef.current?.showModal()}
        />
      }
      mobileNavigation={
        <MobilePaneSwitch
          value={mobilePane}
          onChange={(pane) =>
            setPanelView({
              ...view,
              mobilePane: pane,
              open: pane === "workspace" || workspaceOpen,
            })
          }
          running={session.status === "running"}
          findingsCount={session.findings.length}
        />
      }
    >
      <main
        className="workspace-split"
        data-workspace-open={workspaceOpen}
        ref={splitRef}
        style={
          {
            "--conversation-width": workspaceOpen ? `${conversationWidth}%` : "100%",
          } as CSSProperties
        }
      >
        <ConversationPanel
          key={session.id}
          session={session}
          dispatch={dispatch}
          openFindings={() => openTab("findings")}
          openBrowser={() => openTab("browser")}
          openModelSetup={() => modelSetupRef.current?.showModal()}
        />
        {workspaceOpen && <PanelResizer
          containerRef={splitRef}
          value={conversationWidth}
          onChange={setConversationWidth}
        />}
        {workspaceOpen && <section
          className="workspace-panel"
          id="workspace-panel"
          aria-label="Test workspace"
        >
          <WorkspaceTabs
            value={tab}
            onChange={(next) => setPanelView({ ...view, tab: next })}
            findingsCount={session.findings.length}
            onClose={closeWorkspace}
          />
          {tab === "browser" && (
            <BrowserPanel session={session} dispatch={dispatch} />
          )}
          {tab === "findings" && (
            <FindingsPanel
              key={session.id}
              session={session}
              selectedId={findingId}
              onSelect={setFindingId}
              openReplay={openReplay}
              startDemo={startDemo}
            />
          )}
          {tab === "replay" && (
            <ReplayPanel
              session={session}
              index={replayIndex}
              onIndex={setReplayIndex}
              startDemo={startDemo}
            />
          )}
        </section>}
      </main>
      <SessionHistoryDialog
        dialogRef={historyRef}
        sessions={state.sessions}
        activeId={state.activeId}
        onSelect={selectSession}
        onNewSession={newSession}
      />
      <DemoInfoDialog
        dialogRef={aboutRef}
        canInterrupt={
          session.run > 0 &&
          ["running", "paused", "manual"].includes(session.status)
        }
        onInterrupt={() => {
          dispatch({ type: "session.interrupt" });
          openTab("browser");
        }}
      />
      <ModelSetupDialog
        dialogRef={modelSetupRef}
      />
    </WorkspaceShell>
  );
}
