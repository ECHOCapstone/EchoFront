// 한 줄 텍스트(닉네임, 세션 제목 등)를 수정할 때 쓰는 모달.
// 브라우저 prompt() 보다 일관된 디자인과 키보드 처리를 제공한다.
//
//   open       부모가 직접 통제. 모달이 닫힐 때 onOpenChange(false) 가 한 번 호출된다.
//   onSubmit   확인 클릭 또는 Enter 시 입력값(trim 후) 으로 호출. 빈 값이면 호출되지 않는다.
//   maxLength  잘못된 길이의 입력을 화면 단계에서 차단해 백엔드 왕복을 줄인다.

import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface TextEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initialValue: string;
  placeholder?: string;
  maxLength?: number;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void;
}

export default function TextEditDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValue,
  placeholder,
  maxLength,
  submitLabel = '확인',
  cancelLabel = '취소',
  onSubmit,
}: TextEditDialogProps) {
  const [value, setValue] = useState(initialValue);

  // 모달이 다시 열릴 때마다 부모가 들고 있는 값으로 초기화. 닫혀 있을 때는 동기화하지 않아
  // 사용자가 입력 중인 값이 깜빡이는 것을 막는다.
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={value.trim().length === 0}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
