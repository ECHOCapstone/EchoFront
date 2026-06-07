import { RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ConfirmProvider } from './components/ConfirmProvider';
import { RecordingLockProvider } from './hooks/useRecordingLock';

export default function App() {
  return (
    // 최후 방어선: 라우터/Provider 바깥에서 발생한 렌더 예외까지 잡아 흰 화면을 막는다.
    <AppErrorBoundary>
      <AuthProvider>
        {/* useConfirm 으로 띄우는 공용 확인 다이얼로그를 앱 전역에서 사용할 수 있게 한다. */}
        <ConfirmProvider>
          {/* 동시 녹음 1개 제한 — 학습 화면 / 종합 피드백의 PracticeItemCard 등 모든 녹음 진입점이 공유한다. */}
          <RecordingLockProvider>
            <RouterProvider router={router} />
          </RecordingLockProvider>
        </ConfirmProvider>
        {/* notifyApiError 가 띄우는 토스트의 표면. 앱 전역에 하나만 둔다. */}
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
