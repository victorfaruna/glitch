import { CircleHelp, History, PanelLeft, Plus, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { IconButton } from "@/components/ui/IconButton";

interface NavigationRailProps {
  workspaceOpen: boolean;
  onNewSession(): void;
  onBrowser(): void;
  onHistory(): void;
  onAbout(): void;
  onModelSetup?(): void;
}

export function NavigationRail({
  workspaceOpen,
  onNewSession,
  onBrowser,
  onHistory,
  onAbout,
  onModelSetup,
}: NavigationRailProps) {
  return (
    <nav
      className="flex w-[59px] shrink-0 flex-col justify-between border-r border-subtext/45 bg-background px-2 py-4 max-[900px]:w-[49px] max-[900px]:px-1.5 max-sm:w-[43px] max-sm:px-1"
      aria-label="Main navigation"
    >
      <div className="flex flex-col items-center gap-3">
        <IconButton label="New session" onClick={onNewSession}>
          <Plus size={18} />
        </IconButton>
        <IconButton
          label="Open browser workspace"
          className={`${workspaceOpen ? "selected " : ""}rounded-lg`}
          aria-expanded={workspaceOpen}
          onClick={onBrowser}
        >
          <PanelLeft size={17} />
        </IconButton>
        <IconButton label="Session history" onClick={onHistory}>
          <History size={18} />
        </IconButton>
        {onModelSetup && (
          <IconButton label="Model & system prompt setup" onClick={onModelSetup}>
            <Sparkles size={17} className="text-accent" />
          </IconButton>
        )}
      </div>
      <div className="flex flex-col items-center gap-3">
        <ThemeToggle />
        <IconButton label="About this demo" onClick={onAbout}>
          <CircleHelp size={17} />
        </IconButton>
        <span
          className="relative mt-1 flex size-7 items-center justify-center rounded-full border border-subtext/25 bg-primary text-[11px] font-medium text-secondary/65"
          title="Your local workspace"
        >
          Y
          <span className="absolute right-0 bottom-0 size-2 rounded-full border-2 border-background bg-success" />
        </span>
      </div>
    </nav>
  );
}
