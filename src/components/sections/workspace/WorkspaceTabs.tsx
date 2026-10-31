import { Bug, Globe, History, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { WorkspaceTab } from "@/lib/glitch/types";
import "./workspace.css";

interface WorkspaceTabsProps {
  value: WorkspaceTab;
  onChange(tab: WorkspaceTab): void;
  findingsCount: number;
  onClose(): void;
}

const tabs = [
  { id: "browser", label: "Browser", Icon: Globe },
  { id: "findings", label: "Findings", Icon: Bug },
  { id: "replay", label: "Replay", Icon: History },
] as const;

export function WorkspaceTabs({
  value,
  onChange,
  findingsCount,
  onClose,
}: WorkspaceTabsProps) {
  return (
    <div className="workspace-tabs-bar">
      <fieldset className="tabs workspace-tabs" aria-label="Workspace views">
        {tabs.map(({ id, label, Icon }) => (
          <label
            key={id}
            className={`tab workspace-tab ${value === id ? "tab-active" : ""}`}
          >
            <input
              className="sr-only"
              type="radio"
              name="workspace-view"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              aria-controls={`panel-${id}`}
            />
            <Icon size={14} />
            <span>{label}</span>
            {id === "findings" && (
              <span
                className={`tab-count ${findingsCount ? "tab-count-populated" : ""}`}
              >
                {findingsCount}
              </span>
            )}
          </label>
        ))}
      </fieldset>
      <div className="workspace-tab-actions">
        <span className="workspace-saved">
          <span />
          Local session
        </span>
        <IconButton label="Close browser workspace" onClick={onClose}>
          <X size={15} />
        </IconButton>
      </div>
    </div>
  );
}
