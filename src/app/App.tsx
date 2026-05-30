import { RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      {/* notifyApiError 가 띄우는 토스트의 표면. 앱 전역에 하나만 둔다. */}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
