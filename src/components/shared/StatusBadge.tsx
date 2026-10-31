import {
  Check,
  LoaderCircle,
  Pause,
  MousePointer2,
  CircleAlert,
  Circle,
} from "lucide-react";
import type { SessionStatus } from "@/lib/glitch/types";
import "./shared.css";

const statusInfo = {
  idle: { label: "Ready", icon: Circle, className: "status-idle" },
  running: {
    label: "Running",
    icon: LoaderCircle,
    className: "status-running",
  },
  paused: { label: "Paused", icon: Pause, className: "status-paused" },
  manual: {
    label: "Manual control",
    icon: MousePointer2,
    className: "status-manual",
  },
  completed: { label: "Completed", icon: Check, className: "status-completed" },
  error: { label: "Interrupted", icon: CircleAlert, className: "status-error" },
};

export function StatusBadge({
  status,
  compact = false,
}: {
  status: SessionStatus;
  compact?: boolean;
}) {
  const { label, icon: Icon, className } = statusInfo[status];
  return (
    <span className={`session-status ${className}`}>
      <Icon
        size={compact ? 12 : 13}
        className={status === "running" ? "animate-spin" : ""}
      />
      {label}
    </span>
  );
}
