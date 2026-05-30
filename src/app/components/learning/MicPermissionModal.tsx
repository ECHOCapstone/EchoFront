// useRecorder 의 status 가 denied / unsupported 일 때 학습 흐름 위에 띄우는 안내 모달.
// 권한 재요청 (start 재호출), 닫기 (학습 유지) 두 가지 액션을 제공한다.
//
// "denied" 상태는 브라우저가 권한 거부를 기억하고 있어 단순 재요청만으로는 풀리지 않을 수 있다.
// 그래서 모달 안에 주소창 자물쇠 → 마이크 허용 → 새로고침 안내를 함께 노출한다.

import { Mic, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

export type MicBlockReason = 'denied' | 'unsupported';

interface MicPermissionModalProps {
  reason: MicBlockReason;
  errorMessage?: string | null;
  // 사용자가 "다시 시도" 버튼을 누르면 호출. 보통 recorder.start 를 한 번 더 호출하거나 페이지를 새로고침한다.
  onRetry?: () => void;
  // 사용자가 모달을 직접 닫을 수 있도록 허용할지. 학습 흐름 진행이 어려우므로 기본은 닫기 비활성.
  onDismiss?: () => void;
}

export default function MicPermissionModal({
  reason,
  errorMessage,
  onRetry,
  onDismiss,
}: MicPermissionModalProps) {
  const isUnsupported = reason === 'unsupported';
  const title = isUnsupported ? '녹음을 지원하지 않는 브라우저' : '마이크 접근 권한이 필요해요';
  const description = isUnsupported
    ? '이 브라우저는 녹음 기능을 지원하지 않아요. Chrome / Edge / Firefox 최신 버전으로 다시 접속해 주세요.'
    : '학습을 시작하려면 마이크 접근을 허용해 주세요. 주소창 왼쪽 자물쇠 🔒 를 눌러 마이크 권한을 "허용" 으로 바꾼 뒤 페이지를 새로고침해 주세요.';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="w-full h-32 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-white shadow-inner flex items-center justify-center">
            {isUnsupported ? (
              <AlertCircle size={40} className="text-red-500" />
            ) : (
              <Mic size={40} className="text-orange-500" />
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">{title}</h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-2 text-center">
          {description}
        </p>
        {errorMessage && (
          <p className="text-xs text-gray-500 leading-relaxed mb-4 text-center">
            ({errorMessage})
          </p>
        )}

        {!isUnsupported && (
          <ol className="text-xs text-gray-600 leading-snug list-decimal pl-5 space-y-1 mb-6">
            <li>주소창 왼쪽 자물쇠 🔒 를 클릭</li>
            <li>마이크 항목을 "허용" 으로 변경</li>
            <li>페이지 새로고침</li>
          </ol>
        )}

        <div className="flex gap-2">
          {onRetry && !isUnsupported && (
            <Button
              onClick={onRetry}
              className="flex-1 h-12 bg-brand-500 hover:bg-brand-600 text-white text-base font-bold rounded-2xl"
            >
              다시 시도
            </Button>
          )}
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="outline"
              className="flex-1 h-12 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-2xl"
            >
              나중에
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
