import { Globe, MessageSquare } from "lucide-react";

interface MobilePaneSwitchProps {
  value: "chat" | "workspace";
  onChange(value: "chat" | "workspace"): void;
  running: boolean;
  findingsCount: number;
}

export function MobilePaneSwitch({
  value,
  onChange,
  running,
  findingsCount,
}: MobilePaneSwitchProps) {
  return (
    <div
      className="mobile-pane-switch"
      role="group"
      aria-label="Workspace panels"
    >
      <button
        type="button"
        className={value === "chat" ? "mobile-pane-active" : ""}
        aria-pressed={value === "chat"}
        onClick={() => onChange("chat")}
      >
        <MessageSquare size={13} />
        Chat{running && <span className="mobile-running-dot" />}
      </button>
      <button
        type="button"
        className={value === "workspace" ? "mobile-pane-active" : ""}
        aria-pressed={value === "workspace"}
        onClick={() => onChange("workspace")}
      >
        <Globe size={13} />
        Workspace
        {findingsCount > 0 && (
          <span className="mobile-finding-count">{findingsCount}</span>
        )}
      </button>
    </div>
  );
}
