import { Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { useT } from "../i18n";
import ViewModeToggle, { type ViewMode } from "./ViewModeToggle";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function PreviewControls({
  viewMode,
  onViewModeChange,
  chatOpen,
  onToggleChat,
}: Props) {
  const t = useT();
  const chatLabel = chatOpen ? t("action.closeChat") : t("action.aiChat");

  return (
    <div className="absolute right-3 top-3 z-[120] flex items-center gap-1.5">
      <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
      <button
        type="button"
        aria-label={chatLabel}
        title={chatLabel}
        aria-pressed={chatOpen}
        onClick={onToggleChat}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border shadow-sm transition-colors",
          chatOpen
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Sparkles className="h-4 w-4" />
      </button>
    </div>
  );
}
