// 회원가입 화면. 두 가지 흐름을 한 컴포넌트에서 처리한다.
//
//   1) 표준 가입: 사용자가 직접 모든 필드를 입력한다.
//   2) OAuth 가입 완료: 백엔드가 Google/Kakao 인증을 마치고 신규 사용자를
//      `/signup#pendingToken=...&email=...&nicknameHint=...&provider=...` 로 redirect 한 상태.
//      이 모드에서는 비밀번호 필드를 숨기고, 이메일은 백엔드가 검증한 값으로 잠근다.
//      사용자가 아이디 / 닉네임 / 약관 동의만 채우면 통합 회원으로 가입된다.
//
// pendingToken 은 fragment 로만 받고, mount 직후 history.replaceState 로 url 에서 즉시 지운다.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import Footer from './Footer';
import { authApi } from '../api';
import { useAuth } from '../auth/useAuth';
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

// OAuth 가입 모드 — fragment 로 도착한 pending 정보. provider 는 안내 문구용.
type OAuthSignupContext = {
  pendingToken: string;
  email: string;
  nicknameHint: string;
  provider: string;
};

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  kakao: '카카오',
};

export default function SignUp() {
  const navigate = useNavigate();
  const { acceptOAuthToken } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSignUpComplete, setIsSignUpComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthCtx, setOauthCtx] = useState<OAuthSignupContext | null>(null);
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

  // fragment 의 pendingToken 을 한 번만 읽어 OAuth 모드로 전환한다.
  // 토큰이 url 에 남으면 뒤로가기/북마크로 새는 위험이 있어 즉시 history 를 정리한다.
  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const pendingToken = params.get('pendingToken');
    if (!pendingToken) return;
    const email = params.get('email') ?? '';
    const nicknameHint = params.get('nicknameHint') ?? '';
    const provider = params.get('provider') ?? '';
    setOauthCtx({ pendingToken, email, nicknameHint, provider });
    setFormData((prev) => ({ ...prev, email, nickname: nicknameHint }));
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // 입력 변경 시 폼 값을 갱신하고 해당 필드의 인라인 에러를 비운다.
  // 중복확인 대상(id/email)은 이전 확인 결과도 idle 로 되돌려 다시 확인하게 한다.
  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'nickname') return;
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === 'id' || field === 'email') {
      setCheckStatus((prev) => ({ ...prev, [field]: 'idle' }));
    }
  };

  const handleCheckDuplicate = async (field: 'id' | 'email') => {
    const value = formData[field];
    if (!value) return;
    try {
      const result = field === 'id'
        ? await authApi.checkUsername(value)
        : await authApi.checkEmail(value);
      setCheckStatus((prev) => ({ ...prev, [field]: result.available ? 'available' : 'taken' }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (err) {
      notifyApiError(err, '중복 확인에 실패했습니다.');
    }
  };

  // 모드별로 검증 항목이 다르다. OAuth 모드는 password / email 중복확인이 빠진다.
  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!formData.id) next.id = '아이디를 입력해주세요.';
    else if (checkStatus.id !== 'available') next.id = '아이디 중복확인을 해주세요.';
    if (!oauthCtx) {
      if (!formData.password) next.password = '비밀번호를 입력해주세요.';
      if (formData.password !== formData.passwordConfirm) {
        next.passwordConfirm = '비밀번호가 일치하지 않습니다.';
      }
      if (!formData.email) next.email = '이메일을 입력해주세요.';
      else if (checkStatus.email !== 'available') next.email = '이메일 중복확인을 해주세요.';
    }
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
      if (oauthCtx) {
        // OAuth 가입 완료 — 토큰 응답을 그대로 받아 AuthContext 에 적용 후 메인으로 진입한다.
        const tokenResponse = await authApi.completeOAuthSignup({
          pendingToken: oauthCtx.pendingToken,
          username: formData.id,
          nickname: formData.nickname || oauthCtx.nicknameHint,
          // 체크박스 상태를 그대로 전달 — validation 이 이미 true 를 보장하지만, 향후 validation 이 약해질
          // 때 동의 안 한 사용자가 가입되지 않도록 하드코딩 true 대신 실제 상태를 싣는다.
          agreedTerms: agreed,
        });
        await acceptOAuthToken(tokenResponse.accessToken);
        navigate(paths.main, { replace: true });
        return;
      }
      await authApi.signup({
        username: formData.id,
        password: formData.password,
        nickname: formData.nickname,
        email: formData.email,
        agreedTerms: agreed,
      });
      setIsSignUpComplete(true);
    } catch (err) {
      notifyApiError(err, oauthCtx ? 'Google/카카오 가입 완료에 실패했습니다.' : '회원가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 표준 가입 완료 화면 — OAuth 모드는 가입과 동시에 메인으로 가므로 이 화면을 거치지 않는다.
  if (isSignUpComplete) {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex items-center justify-center p-4">
        <div className="w-full text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <CheckCircle size={80} className="text-brand-500" />
            </div>
            <h1 className="text-4xl font-bold text-brand-500 mb-4">환영합니다!</h1>
            <p className="text-xl text-gray-700 mb-2">회원가입이 완료되었습니다.</p>
            <p className="text-gray-600">로그인하러 가시겠습니까?</p>
          </div>

          <Button
            onClick={() => navigate(paths.login)}
            className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-medium"
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

  const providerLabel = oauthCtx ? (PROVIDER_LABEL[oauthCtx.provider] ?? '소셜') : null;

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex items-center justify-center p-4">
      <div className="w-full">
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
            <h1 className="text-4xl font-bold text-brand-500 mb-2">회원가입</h1>
            <p className="text-gray-600">
              {oauthCtx
                ? `${providerLabel} 계정으로 빠르게 가입해 보세요`
                : 'ECHO!에 오신 것을 환영합니다'}
            </p>
          </div>
        </div>

        {oauthCtx && (
          <div className="mb-6 rounded-xl bg-brand-50 border border-brand-200 p-3 text-sm text-brand-700">
            {providerLabel} 로그인으로 확인된 이메일 <span className="font-semibold">{oauthCtx.email}</span> 로 가입합니다.
            아이디와 닉네임만 정하면 끝!
          </div>
        )}

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
                onChange={(e) => updateField('id', e.target.value)}
                aria-invalid={errors.id !== undefined}
                aria-describedby="signup-id-message"
                className="h-12 flex-1 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
              />
              <Button
                type="button"
                onClick={() => handleCheckDuplicate('id')}
                disabled={!formData.id}
                className="h-12 px-4 bg-brand-500 hover:bg-brand-600 text-white whitespace-nowrap"
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

          {/* 비밀번호 — OAuth 모드는 숨김. 백엔드는 password_hash 를 null 로 저장한다. */}
          {!oauthCtx && (
            <>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-700">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    aria-invalid={errors.password !== undefined}
                    aria-describedby="signup-password-message"
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
                <FieldMessage id="signup-password-message" error={errors.password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password-confirm" className="text-gray-700">비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="signup-password-confirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    value={formData.passwordConfirm}
                    onChange={(e) => updateField('passwordConfirm', e.target.value)}
                    aria-invalid={errors.passwordConfirm !== undefined}
                    aria-describedby="signup-password-confirm-message"
                    className="h-12 pr-10 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
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
                  error={
                    errors.passwordConfirm
                    ?? (formData.passwordConfirm && formData.password !== formData.passwordConfirm
                      ? '비밀번호가 일치하지 않습니다.'
                      : undefined)
                  }
                />
              </div>
            </>
          )}

          {/* 닉네임 */}
          <div className="space-y-2">
            <Label htmlFor="signup-nickname" className="text-gray-700">닉네임</Label>
            <Input
              id="signup-nickname"
              type="text"
              placeholder={oauthCtx?.nicknameHint || '닉네임을 입력하세요'}
              value={formData.nickname}
              onChange={(e) => updateField('nickname', e.target.value)}
              className="h-12 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          {/* 이메일 — OAuth 모드는 readonly + 중복확인 버튼 숨김 */}
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-gray-700">이메일</Label>
            {oauthCtx ? (
              <Input
                id="signup-email"
                type="email"
                value={formData.email}
                readOnly
                className="h-12 border-gray-300 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    aria-invalid={errors.email !== undefined}
                    aria-describedby="signup-email-message"
                    className="h-12 flex-1 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCheckDuplicate('email')}
                    disabled={!formData.email}
                    className="h-12 px-4 bg-brand-500 hover:bg-brand-600 text-white whitespace-nowrap"
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
              </>
            )}
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
                className="border-gray-300 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
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
            className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-medium mt-6 disabled:opacity-60"
          >
            {submitting ? '처리 중...' : oauthCtx ? '가입 완료' : '가입하기'}
          </Button>
        </form>

        <div className="mt-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}

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
    return <p id={id} className="text-sm text-brand-600">{status}</p>;
  }
  return null;
}
