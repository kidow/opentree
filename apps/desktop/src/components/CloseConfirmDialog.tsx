import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CloseConfirmDialog({ onConfirm, onCancel }: Props) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent showClose={false}>
        <DialogHeader>
          <DialogTitle>저장하지 않고 닫으시겠습니까?</DialogTitle>
          <DialogDescription>저장되지 않은 변경사항이 사라집니다.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>취소</Button>
          <Button variant="destructive" onClick={onConfirm}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
