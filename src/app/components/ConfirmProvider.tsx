// 네이티브 window.confirm 을 대체하는 Promise 기반 확인 다이얼로그.
// 앱 어디서든 const confirm = useConfirm(); 후 await confirm({...}) 로 사용자의 선택(boolean)을 받는다.
// 표시는 앱의 AlertDialog(shadcn) 로 일관되게 렌더한다.

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export interface ConfirmOptions {
  // 다이얼로그 제목 (기본: "확인")
  title?: string;
  // 본문 설명. 줄바꿈(\n)은 단락으로 렌더된다.
  description?: string;
  // 확인 버튼 라벨 (기본: "확인")
  confirmLabel?: string;
  // 취소 버튼 라벨 (기본: "취소")
  cancelLabel?: string;
  // true 면 확인 버튼을 파괴적(빨강) 스타일로 노출한다(삭제·탈퇴 등).
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// 확인 다이얼로그를 띄우는 함수. ConfirmProvider 하위에서만 호출할 수 있다.
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm 은 ConfirmProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}

// 한 번에 하나의 확인 요청만 처리한다. 요청이 들어오면 resolve 를 보관했다가 선택 시 호출한다.
interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (result: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    []
  );

  // 선택을 확정하고 대기 중이던 Promise 를 깨운다.
  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  const options = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) settle(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title ?? '확인'}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription className="whitespace-pre-line">
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {options?.cancelLabel ?? '취소'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={options?.destructive ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}
            >
              {options?.confirmLabel ?? '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
