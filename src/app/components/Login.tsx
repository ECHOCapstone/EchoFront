import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import Footer from './Footer';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';
import { getGoogleOAuthStartUrl } from '../api/auth';

// 백엔드 OAuth2 실패 핸들러가 붙이는 ?oauthError=<code> 쿼리를 사용자 친화적 한국어 메시지로 매핑한다.
// 백엔드와 코드 식별자만 공유하면 되므로 메시지는 프론트 SSOT 으로 둔다.
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Google 로그인 응답에서 토큰을 찾지 못했습니다. 다시 시도해 주세요.',
  session_failed: 'Google 로그인 후 사용자 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
  invalid_user_info: 'Google 계정 정보가 올바르지 않습니다.',
  invalid_email: 'Google 계정 이메일을 확인할 수 없습니다.',
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) navigate(paths.main, { replace: true });
  }, [isAuthenticated, navigate]);

  // 백엔드 OAuth2 실패 redirect 또는 OAuthCallback 의 fallback 으로 들어온 에러를 한 번만 알린다.
  useEffect(() => {
    const code = searchParams.get('oauthError');
    if (!code) return;
    const message = OAUTH_ERROR_MESSAGES[code] ?? 'Google 로그인에 실패했습니다.';
    alert(message);
    // 같은 메시지가 새로고침/뒤로가기로 반복되지 않게 쿼리를 정리한다.
    window.history.replaceState(null, '', paths.login);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await login({ username: formData.id, password: formData.password });
      navigate(paths.main, { replace: true });
    } catch (err) {
      notifyApiError(err, '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    if (provider !== 'Google') {
      alert(`${provider} 로그인은 아직 준비 중입니다.`);
      return;
    }
    if (submitting) return;
    // Google OAuth2 는 백엔드 → Google → 백엔드 → 프론트 redirect 흐름이라 페이지 자체를 navigate 한다.
    // setSubmitting 으로 시각 표시는 가능하지만, navigate 직후 새 페이지로 이동하므로 굳이 두지 않는다.
    window.location.href = getGoogleOAuthStartUrl();
  };

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex items-center justify-center p-4">
      <div className="w-full">
        {/* 로고 */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-brand-500">ECHO!</h1>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* ID 입력 */}
            <div className="space-y-2">
              <Label htmlFor="id" className="text-gray-700">아이디</Label>
              <Input
                id="id"
                type="text"
                placeholder="아이디를 입력하세요"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="h-12 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>

            {/* Password 입력 */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 pr-10 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* 로그인 버튼 — 두 입력이 모두 채워졌을 때만 활성화. 빈 입력으로 굳이 백엔드를 거쳐 401 받지 않게 한다. */}
          <Button
            type="submit"
            disabled={submitting || !formData.id.trim() || !formData.password}
            className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-medium disabled:opacity-60"
          >
            {submitting ? '로그인 중...' : '로그인'}
          </Button>

          {/* 소셜 로그인 */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">또는</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              {/* 구글 로그인 아이콘 */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="w-14 h-14 rounded-full border-2 border-gray-300 hover:border-brand-500 flex items-center justify-center transition-colors group"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </button>

              {/* 카카오톡 로그인 아이콘 */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Kakao')}
                className="w-14 h-14 rounded-full bg-[#FEE500] hover:bg-[#FDD835] flex items-center justify-center transition-colors"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#000000">
                  <path d="M12 3C6.477 3 2 6.477 2 10.824c0 2.696 1.816 5.06 4.548 6.455-.192.712-.75 2.793-.863 3.228-.138.523.193.516.407.375.173-.114 2.69-1.817 3.736-2.527.7.094 1.423.145 2.172.145 5.523 0 10-3.477 10-7.824C22 6.477 17.523 3 12 3z" />
                </svg>
              </button>
            </div>
          </div>
        </form>

        {/* 회원가입 버튼 */}
        <div className="mt-8">
          <Button
            type="button"
            onClick={() => navigate(paths.signup)}
            variant="outline"
            className="w-full h-12 border-brand-500 text-brand-500 hover:bg-brand-50 font-medium"
          >
            회원가입
          </Button>
        </div>

        <div className="mt-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}