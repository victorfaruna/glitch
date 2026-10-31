"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MousePointer2 } from "lucide-react";
import type { ActionTarget, ViewportSize } from "@/lib/glitch/types";
import "./browser-viewport.css";

// Replace the children with a remote viewer later; viewport sizing, scrolling,
// read-only replay, and the workspace around it stay independent of transport.
export function BrowserViewport({
  children,
  viewport,
  highlight,
  label,
  readOnly = false,
}: {
  children: ReactNode;
  viewport: ViewportSize;
  highlight?: ActionTarget;
  label?: string;
  readOnly?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!highlight) return;
    rootRef.current
      ?.querySelector(`[data-agent-target="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [highlight, label]);
  return (
    <div
      className={`browser-canvas ${viewport === "mobile" ? "viewport-mobile" : ""}`}
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-label={
        readOnly ? "Scrollable replay snapshot" : "Scrollable browser preview"
      }
    >
      <div
        className={`browser-viewport ${readOnly ? "viewport-readonly" : ""}`}
        data-highlight={highlight}
        aria-label={
          readOnly ? "Demo replay preview" : "Interactive Demo Store preview"
        }
      >
        {children}
      </div>
      {label && (
        <div className="agent-action-caption">
          <MousePointer2 size={12} />
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}
