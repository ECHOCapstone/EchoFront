// 렌더링 도중 처리되지 않은 예외가 발생했을 때 흰 화면 대신 보여주는 공용 대체 화면.
// 클래스 에러 바운더리(AppErrorBoundary)와 라우트 에러 바운더리(RouteErrorBoundary)가 함께 쓴다.

import { Button } from './ui/button';
import { paths } from '../lib/paths';

interface ErrorFallbackProps {
  // 개발 환경에서만 노출하는 원인 메시지. 운영에서는 사용자에게 보여주지 않는다.
  detail?: string;
  // "다시 시도" 동작. 미지정 시 전체 새로고침으로 대체한다.
  onRetry?: () => void;
}

export default function ErrorFallback({ detail, onRetry }: ErrorFallbackProps) {
  const retry = onRetry ?? (() => window.location.reload());
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold text-gray-800">문제가 발생했어요</h1>
      <p className="text-sm text-gray-500">
        화면을 불러오는 중 오류가 생겼습니다. 잠시 후 다시 시도해 주세요.
      </p>
      {/* 원인 메시지는 디버깅에 유용하지만 사용자에게 노출하면 안 되므로 개발 모드에서만 보여준다. */}
      {detail && import.meta.env.DEV && (
        <pre className="max-w-md overflow-auto rounded-md bg-gray-100 p-3 text-left text-xs text-gray-600">
          {detail}
        </pre>
      )}
      <div className="flex gap-2">
        <Button onClick={retry}>다시 시도</Button>
        <Button variant="outline" onClick={() => { window.location.href = paths.main; }}>
          홈으로
        </Button>
      </div>
    </div>
  );
}
