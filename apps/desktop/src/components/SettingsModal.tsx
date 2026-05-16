import type { useAppStore } from "../store";
import { useT } from "../i18n";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import Settings from "./Settings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: ReturnType<typeof useAppStore>;
  projectPath?: string;
}

export default function SettingsModal({ open, onOpenChange, store, projectPath }: Props) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="settings-modal-content">
        <div className="settings-modal-header">
          <DialogTitle className="settings-modal-title">{t("settings.title")}</DialogTitle>
        </div>
        <div className="settings-modal-body">
          <Settings store={store} projectPath={projectPath} inModal />
        </div>
        <div className="settings-modal-footer">
          <span className="settings-modal-hint">{t("settings.shortcutHint")}</span>
        </div>
        <style>{`
          .settings-modal-content {
            width: 680px;
            max-width: 92vw;
            height: 78vh;
            max-height: 680px;
            padding: 0;
            gap: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .settings-modal-header {
            height: 52px;
            flex-shrink: 0;
            padding: 0 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
          }
          .settings-modal-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
          .settings-modal-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
          .settings-modal-footer {
            height: 44px;
            flex-shrink: 0;
            padding: 0 24px;
            border-top: 1px solid var(--border);
            display: flex;
            align-items: center;
          }
          .settings-modal-hint { font-size: 11px; color: var(--text-muted); }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
