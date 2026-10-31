import type { ReactNode } from "react";
import "./workspace-shell.css";

interface WorkspaceShellProps {
  header: ReactNode;
  navigation: ReactNode;
  mobileNavigation: ReactNode;
  mobilePane: "chat" | "workspace";
  children: ReactNode;
  persistenceWarning: boolean;
  onFocusComposer(): void;
}

export function WorkspaceShell({
  header,
  navigation,
  mobileNavigation,
  mobilePane,
  children,
  persistenceWarning,
  onFocusComposer,
}: WorkspaceShellProps) {
  return (
    <div
      className="glitch-app bg-background text-secondary"
      data-mobile-pane={mobilePane}
    >
      <a href="#agent-message" className="skip-link" onClick={onFocusComposer}>
        Skip to message composer
      </a>
      {header}
      {persistenceWarning && (
        <div className="storage-warning" role="status">
          Local storage is unavailable. You can use the demo, but your session
          may not survive a refresh.
        </div>
      )}
      <div className="app-body">
        {navigation}
        {mobileNavigation}
        {children}
      </div>
    </div>
  );
}
