import { Monitor, Smartphone } from "lucide-react";
import { cn } from "../lib/utils";

export type ViewMode = "phone" | "desktop";

export const VIEW_MODE_STORAGE_KEY = "opentree.previewViewMode";

export function loadViewMode(): ViewMode {
  return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "desktop"
    ? "desktop"
    : "phone";
}

const OPTIONS: { mode: ViewMode; icon: typeof Monitor; label: string }[] = [
  { mode: "phone", icon: Smartphone, label: "휴대폰" },
  { mode: "desktop", icon: Monitor, label: "데스크탑" },
];

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewModeToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-sm">
      {OPTIONS.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          aria-label={label}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded transition-colors",
            value === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
