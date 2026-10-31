import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

interface WorkspaceHeaderProps {
  title: string;
  onNewSession(): void;
  onModelSetup?(): void;
}

export function WorkspaceHeader({
  title,
  onNewSession,
  onModelSetup,
}: WorkspaceHeaderProps) {
  return (
    <header className="relative z-10 flex h-[53px] shrink-0 items-center gap-6 border-b border-subtext/50 bg-background px-5 max-sm:gap-3 max-sm:px-3">
      <div className="flex  shrink-0 items-center gap-2 text-accent max-sm:w-auto">
        <Logo className="size-4 text-secondary max-sm:size-5" />
        <span className="text-sm leading-none font-medium tracking-[-0.5px] text-secondary max-sm:text-base">
          glitch<span className="text-accent">.</span>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 text-xs text-secondary/45">
        <span className="max-[900px]:hidden">Workspace</span>
        <ChevronRight size={13} className="shrink-0 max-[900px]:hidden" />
        <span
          className="truncate font-medium text-secondary/75 max-sm:text-[10px]"
          title={title}
        >
          {title}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 max-sm:gap-2">
        {onModelSetup && (
          <button
            type="button"
            className="btn btn-sm btn-ghost gap-1.5 max-sm:size-7 max-sm:p-0 text-secondary/80 hover:text-secondary"
            aria-label="Model & prompt setup"
            onClick={onModelSetup}
            title="Configure Gemma model & system prompt"
          >
            <Sparkles size={14} className="text-accent" />
            <span className="max-sm:hidden">Model Setup</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-sm gap-1.5 max-sm:size-7 max-sm:p-0"
          aria-label="New session"
          onClick={onNewSession}
        >
          <Plus size={14} />
          <span className="max-sm:hidden">New session</span>
        </button>
      </div>
    </header>
  );
}
