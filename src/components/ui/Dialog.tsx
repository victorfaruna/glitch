import type { ReactNode, Ref } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";
import "./dialog.css";

interface DialogProps {
  dialogRef: Ref<HTMLDialogElement>;
  titleId: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  dialogRef,
  titleId,
  children,
  className = "",
}: DialogProps) {
  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      aria-labelledby={titleId}
    >
      <div className="modal-box">{children}</div>
      <form method="dialog" className="modal-backdrop">
        <button>Close dialog</button>
      </form>
    </dialog>
  );
}

export function DialogHeader({
  id,
  title,
  eyebrow,
  icon,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="dialog-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <div className={icon ? "flex items-center gap-2.5" : ""}>
          {icon}
          <h2 id={id}>{title}</h2>
        </div>
      </div>
      <form method="dialog">
        <IconButton type="submit" label={`Close ${title}`}>
          <X size={17} />
        </IconButton>
      </form>
    </div>
  );
}
