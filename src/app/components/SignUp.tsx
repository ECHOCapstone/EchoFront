import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import Footer from './Footer';
import { authApi } from '../api';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

// 입력 필드별 인라인 에러 메시지를 담는 컨테이너. 키가 없으면 그 필드는 정상.
type FormErrors = {
  id?: string;
  password?: string;
  passwordConfirm?: string;
  email?: string;
  terms?: string;
};

// 중복 확인 결과를 인라인으로 노출하기 위한 상태. idle 일 때는 메시지 자체가 표시되지 않는다.
type CheckStatus = 'idle' | 'available' | 'taken';

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
  const [checkStatus, setCheckStatus] = useState<{ id: CheckStatus; email: CheckStatus }>({
    id: 'idle',
    email: 'idle',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleCheckDuplicate = async (field: 'id' | 'email') => {
    const value = formData[field];
    if (!value) return;
    try {
      const result = field === 'id'
        ? await authApi.checkUsername(value)
        : await authApi.checkEmail(value);
      setCheckStatus((prev) => ({ ...prev, [field]: result.available ? 'available' : 'taken' }));
      // 중복확인이 다시 통과했다면 같은 필드에 묶여 있던 에러 메시지도 같이 비운다.
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (err) {
      notifyApiError(err, '중복 확인에 실패했습니다.');
    }
  };

  // 제출 직전 모든 필드를 한 번에 검증한다. 첫 번째 에러에서 멈추지 않고 모두 모아 인라인으로 노출.
  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!formData.id) next.id = '아이디를 입력해주세요.';
    else if (checkStatus.id !== 'available') next.id = '아이디 중복확인을 해주세요.';
    if (!formData.password) next.password = '비밀번호를 입력해주세요.';
    if (formData.password !== formData.passwordConfirm) {
      next.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }
    if (!formData.email) next.email = '이메일을 입력해주세요.';
    else if (checkStatus.email !== 'available') next.email = '이메일 중복확인을 해주세요.';
    if (!agreed) next.terms = '서비스 이용약관에 동의해주세요.';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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

          <div className="mt-8">
            <Footer />
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
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                  // 입력이 바뀌면 이전 중복확인 결과는 무효화한다.
                  setCheckStatus((prev) => ({ ...prev, id: 'idle' }));
                  setErrors((prev) => ({ ...prev, id: undefined }));
                }}
                aria-invalid={errors.id !== undefined}
                aria-describedby="signup-id-message"
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
            <FieldMessage
              id="signup-id-message"
              error={errors.id}
              status={checkStatus.id === 'available' ? '사용 가능한 아이디입니다.' : null}
              statusKind={checkStatus.id === 'taken' ? 'error' : 'ok'}
              statusError={checkStatus.id === 'taken' ? '이미 사용 중인 아이디입니다.' : null}
            />
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
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={errors.password !== undefined}
                aria-describedby="signup-password-message"
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
            <FieldMessage id="signup-password-message" error={errors.password} />
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
                onChange={(e) => {
                  setFormData({ ...formData, passwordConfirm: e.target.value });
                  setErrors((prev) => ({ ...prev, passwordConfirm: undefined }));
                }}
                aria-invalid={errors.passwordConfirm !== undefined}
                aria-describedby="signup-password-confirm-message"
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
            <FieldMessage
              id="signup-password-confirm-message"
              // 입력 중에도 즉시 mismatch 메시지가 떠야 사용자가 바로 잡을 수 있다.
              error={
                errors.passwordConfirm
                ?? (formData.passwordConfirm && formData.password !== formData.passwordConfirm
                  ? '비밀번호가 일치하지 않습니다.'
                  : undefined)
              }
            />
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
                  setCheckStatus((prev) => ({ ...prev, email: 'idle' }));
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={errors.email !== undefined}
                aria-describedby="signup-email-message"
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
            <FieldMessage
              id="signup-email-message"
              error={errors.email}
              status={checkStatus.email === 'available' ? '사용 가능한 이메일입니다.' : null}
              statusKind={checkStatus.email === 'taken' ? 'error' : 'ok'}
              statusError={checkStatus.email === 'taken' ? '이미 사용 중인 이메일입니다.' : null}
            />
          </div>

          {/* 서비스 이용약관 동의 */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => {
                  setAgreed(checked as boolean);
                  setErrors((prev) => ({ ...prev, terms: undefined }));
                }}
                className="border-gray-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-700 cursor-pointer"
              >
                서비스 이용약관에 동의합니다
              </label>
            </div>
            <FieldMessage error={errors.terms} />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium mt-6 disabled:opacity-60"
          >
            {submitting ? '처리 중...' : '가입하기'}
          </Button>
        </form>

        <div className="mt-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// 인라인 필드 메시지. error 가 있으면 빨강 우선, 없고 status 만 있으면 파랑/빨강 보조 메시지 표시.
//   error          — 검증 실패 메시지 (빨강)
//   status         — 성공 메시지 (statusKind 'ok' 일 때 파랑)
//   statusError    — 실패 메시지 (statusKind 'error' 일 때 빨강)
interface FieldMessageProps {
  id?: string;
  error?: string;
  status?: string | null;
  statusKind?: 'ok' | 'error';
  statusError?: string | null;
}

function FieldMessage({ id, error, status, statusKind, statusError }: FieldMessageProps) {
  if (error) {
    return <p id={id} className="text-sm text-red-500">{error}</p>;
  }
  if (statusKind === 'error' && statusError) {
    return <p id={id} className="text-sm text-red-500">{statusError}</p>;
  }
  if (status) {
    return <p id={id} className="text-sm text-sky-600">{status}</p>;
  }
  return null;
}
