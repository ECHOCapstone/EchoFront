import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // 로그인 성공 시 메인 페이지로 이동 (닉네임은 임시로 아이디 사용)
    navigate('/main', { state: { nickname: formData.id || '사용자' } });
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`${provider} 로그인`);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-sky-500">ECHO!</h1>
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
                className="h-12 border-gray-300 focus:border-sky-500 focus:ring-sky-500"
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
                  className="h-12 pr-10 border-gray-300 focus:border-sky-500 focus:ring-sky-500"
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

          {/* 로그인 버튼 */}
          <Button
            type="submit"
            className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium"
          >
            로그인
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
                className="w-14 h-14 rounded-full border-2 border-gray-300 hover:border-sky-500 flex items-center justify-center transition-colors group"
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
            onClick={() => navigate('/signup')}
            variant="outline"
            className="w-full h-12 border-sky-500 text-sky-500 hover:bg-sky-50 font-medium"
          >
            회원가입
          </Button>
        </div>

        {/* 저작권 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © O(1)
          </p>
        </div>
      </div>
    </div>
  );
}