"use client";

import { useRef, type RefObject } from "react";

interface PanelResizerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  value: number;
  onChange(value: number): void;
}

const clampWidth = (width: number) => Math.min(46, Math.max(27, width));

export function PanelResizer({
  containerRef,
  value,
  onChange,
}: PanelResizerProps) {
  const draggingRef = useRef(false);
  return (
    <div
      className="panel-resizer"
      role="separator"
      tabIndex={0}
      aria-label="Resize conversation panel"
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={27}
      aria-valuemax={46}
      aria-valuetext={`${Math.round(value)} percent`}
      aria-controls="conversation-panel workspace-panel"
      onPointerDown={(event) => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        onChange(clampWidth(((event.clientX - rect.left) / rect.width) * 100));
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        draggingRef.current = false;
      }}
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          onChange(
            event.key === "Home"
              ? 27
              : event.key === "End"
                ? 46
                : clampWidth(value + (event.key === "ArrowLeft" ? -2 : 2)),
          );
        }
      }}
    >
      <span />
    </div>
  );
}
