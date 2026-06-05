import { RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ConfirmProvider } from './components/ConfirmProvider';

export default function App() {
  return (
    // 최후 방어선: 라우터/Provider 바깥에서 발생한 렌더 예외까지 잡아 흰 화면을 막는다.
    <AppErrorBoundary>
      <AuthProvider>
        {/* useConfirm 으로 띄우는 공용 확인 다이얼로그를 앱 전역에서 사용할 수 있게 한다. */}
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
        {/* notifyApiError 가 띄우는 토스트의 표면. 앱 전역에 하나만 둔다. */}
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
