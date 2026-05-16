import { open as openExternal } from "@tauri-apps/plugin-shell";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useT } from "../i18n";

const ISSUES_URL = "https://github.com/kidow/opentree/issues";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeedbackModal({ open, onOpenChange }: Props) {
  const t = useT();

  const handleGoToIssues = async () => {
    try {
      await openExternal(ISSUES_URL);
    } catch {
      /* ignore — external browser may be unavailable */
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false}>
        <DialogHeader>
          <DialogTitle>📢 {t("feedback.title")}</DialogTitle>
          <DialogDescription>{t("feedback.intro")}</DialogDescription>
        </DialogHeader>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          {t("feedback.checkExisting")}
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          {t("feedback.howToWrite")}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("feedback.close")}
          </Button>
          <Button onClick={handleGoToIssues}>{t("feedback.goToIssues")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
