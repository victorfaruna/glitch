import type { RefObject } from "react";
import { FlaskConical, Sparkles } from "lucide-react";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { GlitchMark } from "./GlitchMark";
import "./session-dialogs.css";

interface DemoInfoDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  canInterrupt: boolean;
  onInterrupt(): void;
}

export function DemoInfoDialog({
  dialogRef,
  canInterrupt,
  onInterrupt,
}: DemoInfoDialogProps) {
  return (
    <Dialog
      dialogRef={dialogRef}
      titleId="about-title"
      className="about-dialog"
    >
      <DialogHeader
        id="about-title"
        title="Meet Glitch."
        icon={<GlitchMark className="text-accent" />}
      />
      <p className="about-lead">
        An AI testing workspace, built for a little productive mischief.
      </p>
      <div className="about-demo-notice">
        <FlaskConical size={18} />
        <div>
          <strong>You’re exploring a scripted UI demo.</strong>
          <p>
            The checkout test uses a local React store with an intentional
            duplicate-order bug. No AI inference, live browser connection, or
            real payment is involved.
          </p>
        </div>
      </div>
      <ol className="about-steps">
        <li>
          <span>01</span>Give Glitch a checkout testing mission.
        </li>
        <li>
          <span>02</span>Watch the store change. Pause or take control.
        </li>
        <li>
          <span>03</span>Inspect the finding and its step-by-step replay.
        </li>
      </ol>
      <div className="about-recovery">
        <div>
          <strong>Try the recovery state</strong>
          <p>
            Interrupt an active test, then use Retry to continue from its saved
            progress.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!canInterrupt}
          onClick={() => {
            onInterrupt();
            dialogRef.current?.close();
          }}
        >
          Simulate interruption
        </button>
      </div>
      {!canInterrupt && (
        <p className="about-disabled-note">
          Start or pause a demo run to enable interruption.
        </p>
      )}
      <div className="about-footer">
        <Sparkles size={13} />
        Designed for Gemma · Browser automation coming later
      </div>
    </Dialog>
  );
}
