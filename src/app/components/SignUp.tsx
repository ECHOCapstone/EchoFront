import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { authApi } from '../api';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSignUpComplete, setIsSignUpComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    email: '',
  });
  const [checkResults, setCheckResults] = useState({
    id: false,
    email: false,
  });

  const handleCheckDuplicate = async (field: 'id' | 'email') => {
    const value = formData[field];
    if (!value) return;
    try {
      const result = field === 'id'
        ? await authApi.checkUsername(value)
        : await authApi.checkEmail(value);
      setCheckResults((prev) => ({ ...prev, [field]: result.available }));
      const label = field === 'id' ? '아이디' : '이메일';
      alert(result.available ? `사용 가능한 ${label}입니다.` : `이미 사용 중인 ${label}입니다.`);
    } catch (err) {
      notifyApiError(err, '중복 확인에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!checkResults.id) {
      alert('아이디 중복확인을 해주세요.');
      return;
    }
    if (!checkResults.email) {
      alert('이메일 중복확인을 해주세요.');
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreed) {
      alert('서비스 이용약관에 동의해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.signup({
        username: formData.id,
        password: formData.password,
        nickname: formData.nickname,
        email: formData.email,
        agreedTerms: true,
      });
      setIsSignUpComplete(true);
    } catch (err) {
      notifyApiError(err, '회원가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 회원가입 완료 화면
  if (isSignUpComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <CheckCircle size={80} className="text-sky-500" />
            </div>
            <h1 className="text-4xl font-bold text-sky-500 mb-4">환영합니다!</h1>
            <p className="text-xl text-gray-700 mb-2">회원가입이 완료되었습니다.</p>
            <p className="text-gray-600">로그인하러 가시겠습니까?</p>
          </div>

          <Button
            onClick={() => navigate(paths.login)}
            className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium"
          >
            로그인하기
          </Button>

          {/* 저작권 */}
          <div className="mt-8">
            <p className="text-xs text-gray-500">
              © O(1)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => navigate(paths.login)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            뒤로가기
          </button>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-sky-500 mb-2">회원가입</h1>
            <p className="text-gray-600">ECHO!에 오신 것을 환영합니다</p>
          </div>
        </div>

        {/* 회원가입 폼 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ID 입력 + 중복확인 */}
          <div className="space-y-2">
            <Label htmlFor="signup-id" className="text-gray-700">아이디</Label>
            <div className="flex gap-2">
              <Input
                id="signup-id"
                type="text"
                placeholder="아이디를 입력하세요"
                value={formData.id}
                onChange={(e) => {
                  setFormData({ ...formData, id: e.target.value });
                  setCheckResults({ ...checkResults, id: false });
                }}
                className="h-12 flex-1 border-gray-300 focus:border-sky-500 focus:ring-sky-500"
              />
              <Button
                type="button"
                onClick={() => handleCheckDuplicate('id')}
                disabled={!formData.id}
                className="h-12 px-4 bg-sky-500 hover:bg-sky-600 text-white whitespace-nowrap"
              >
                중복확인
              </Button>
            </div>
          </div>

          {/* Password 입력 */}
          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-gray-700">비밀번호</Label>
            <div className="relative">
              <Input
                id="signup-password"
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

          {/* Password 확인 입력 */}
          <div className="space-y-2">
            <Label htmlFor="signup-password-confirm" className="text-gray-700">비밀번호 확인</Label>
            <div className="relative">
              <Input
                id="signup-password-confirm"
                type={showPasswordConfirm ? 'text' : 'password'}
                placeholder="비밀번호를 다시 입력하세요"
                value={formData.passwordConfirm}
                onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                className="h-12 pr-10 border-gray-300 focus:border-sky-500 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
              <p className="text-sm text-red-500">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          {/* 닉네임 입력 */}
          <div className="space-y-2">
            <Label htmlFor="signup-nickname" className="text-gray-700">닉네임</Label>
            <Input
              id="signup-nickname"
              type="text"
              placeholder="닉네임을 입력하세요"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="h-12 border-gray-300 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          {/* 이메일 입력 + 중복확인 */}
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-gray-700">이메일</Label>
            <div className="flex gap-2">
              <Input
                id="signup-email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setCheckResults({ ...checkResults, email: false });
                }}
                className="h-12 flex-1 border-gray-300 focus:border-sky-500 focus:ring-sky-500"
              />
              <Button
                type="button"
                onClick={() => handleCheckDuplicate('email')}
                disabled={!formData.email}
                className="h-12 px-4 bg-sky-500 hover:bg-sky-600 text-white whitespace-nowrap"
              >
                중복확인
              </Button>
            </div>
          </div>

          {/* 서비스 이용약관 동의 */}
          <div className="pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked as boolean)}
                className="border-gray-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-700 cursor-pointer"
              >
                서비스 이용약관에 동의합니다
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium mt-6 disabled:opacity-60"
          >
            {submitting ? '처리 중...' : '가입하기'}
          </Button>
        </form>

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