// 회원가입 화면. 두 가지 흐름을 한 컴포넌트에서 처리한다.
//
//   1) 표준 가입: 사용자가 직접 모든 필드를 입력한다.
//   2) OAuth 가입 완료: 백엔드가 Google/Kakao 인증을 마치고 신규 사용자를
//      `/signup#pendingToken=...&email=...&nicknameHint=...&provider=...` 로 redirect 한 상태.
//      이 모드에서는 아이디 / 비밀번호 필드를 숨기고 이메일은 백엔드가 검증한 값으로 잠근다.
//      내부 username 은 백엔드가 (provider, providerUid) 로 자동 생성하므로 사용자는 닉네임만 정한다.
//      사용자가 닉네임 + 동의 4종만 채우면 통합 회원으로 가입된다.
//
// pendingToken 은 fragment 로만 받고, mount 직후 history.replaceState 로 url 에서 즉시 지운다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import Footer from './Footer';
import TermsModal from './auth/TermsModal';
import { authApi, legalApi, type PasswordPolicy, type TermsResponse } from '../api/auth';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

// 입력 필드별 인라인 에러 메시지를 담는 컨테이너. 키가 없으면 그 필드는 정상.
type FormErrors = {
  id?: string;
  password?: string;
  passwordConfirm?: string;
  email?: string;
  agreements?: string;
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

// 동의 항목 4종 — 필수 3종 + 선택 1종.
type Agreements = {
  terms: boolean;
  privacy: boolean;
  ageOver14: boolean;
  marketing: boolean;
};

const EMPTY_AGREEMENTS: Agreements = { terms: false, privacy: false, ageOver14: false, marketing: false };

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  kakao: '카카오',
};

// 정책이 백엔드에서 도착하기 전에 폼 자체가 동작하도록 최소 기본값을 둔다 — 도착 후 덮어쓴다.
const DEFAULT_POLICY: PasswordPolicy = { minLength: 8, maxLength: 100, requireCategories: 2 };

export default function SignUp() {
  const navigate = useNavigate();
  const { acceptOAuthToken } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [agreements, setAgreements] = useState<Agreements>(EMPTY_AGREEMENTS);
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
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);
  const [terms, setTerms] = useState<TermsResponse | null>(null);
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);

  // 중복확인 디바운스 타이머 — 입력이 멈춘 뒤 자동 호출.
  const idCheckTimer = useRef<number | null>(null);
  const emailCheckTimer = useRef<number | null>(null);

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

  // 비밀번호 정책 + 약관 본문을 가입 폼 mount 시 한 번만 받는다.
  useEffect(() => {
    let cancelled = false;
    authApi.passwordPolicy().then((res) => { if (!cancelled) setPolicy(res); }).catch(() => {});
    legalApi.terms().then((res) => { if (!cancelled) setTerms(res); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 비밀번호 정책 안내 한 줄. 백엔드 정책이 바뀌어도 폼이 자동으로 따라간다.
  const passwordHint = useMemo(() => {
    return `${policy.minLength}~${policy.maxLength}자, 영문 소문자 / 대문자 / 숫자 / 특수문자 중 ${policy.requireCategories}가지 이상 포함`;
  }, [policy]);

  // 입력 변경 시 폼 값을 갱신하고 해당 필드의 인라인 에러를 비운다.
  // 중복확인 대상(id/email)은 이전 확인 결과도 idle 로 되돌려 디바운스 후 자동 재확인한다.
  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'nickname') return;
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === 'id') {
      setCheckStatus((prev) => ({ ...prev, id: 'idle' }));
      if (idCheckTimer.current) window.clearTimeout(idCheckTimer.current);
      const trimmed = value.trim();
      if (trimmed) {
        idCheckTimer.current = window.setTimeout(() => void runCheck('id', trimmed), 400);
      }
    } else if (field === 'email') {
      setCheckStatus((prev) => ({ ...prev, email: 'idle' }));
      if (emailCheckTimer.current) window.clearTimeout(emailCheckTimer.current);
      const trimmed = value.trim();
      if (trimmed && trimmed.includes('@')) {
        emailCheckTimer.current = window.setTimeout(() => void runCheck('email', trimmed), 400);
      }
    }
  };

  const runCheck = async (field: 'id' | 'email', value: string) => {
    try {
      const result = field === 'id'
        ? await authApi.checkUsername(value)
        : await authApi.checkEmail(value);
      setCheckStatus((prev) => ({ ...prev, [field]: result.available ? 'available' : 'taken' }));
    } catch {
      // 일시적 오류는 사용자를 막지 않는다 — 가입 제출 시 백엔드가 한 번 더 검증한다.
    }
  };

  // 모드별로 검증 항목이 다르다.
  //   표준 가입       : id 중복확인 / password / passwordConfirm / email 중복확인 / 동의
  //   OAuth 가입 완료 : nickname / 동의 (id 와 email 은 백엔드가 결정하므로 검증 대상이 아니다)
  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!oauthCtx) {
      if (!formData.id) next.id = '아이디를 입력해주세요.';
      else if (checkStatus.id === 'taken') next.id = '이미 사용 중인 아이디입니다.';
      else if (checkStatus.id !== 'available') next.id = '아이디 중복확인이 완료되지 않았습니다.';
      if (!formData.password) {
        next.password = '비밀번호를 입력해주세요.';
      } else if (formData.password.length < policy.minLength) {
        next.password = `비밀번호는 ${policy.minLength}자 이상이어야 합니다.`;
      } else if (formData.password.length > policy.maxLength) {
        next.password = `비밀번호는 ${policy.maxLength}자 이하여야 합니다.`;
      }
      if (formData.password !== formData.passwordConfirm) {
        next.passwordConfirm = '비밀번호가 일치하지 않습니다.';
      }
      if (!formData.email) next.email = '이메일을 입력해주세요.';
      else if (checkStatus.email === 'taken') next.email = '이미 사용 중인 이메일입니다.';
      else if (checkStatus.email !== 'available') next.email = '이메일 중복확인이 완료되지 않았습니다.';
    }
    if (!agreements.terms || !agreements.privacy || !agreements.ageOver14) {
      next.agreements = '필수 항목에 모두 동의해 주세요.';
    }
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
        const tokenResponse = await authApi.completeOAuthSignup({
          pendingToken: oauthCtx.pendingToken,
          nickname: formData.nickname || oauthCtx.nicknameHint,
          agreedTerms: agreements.terms,
          agreedPrivacy: agreements.privacy,
          agreedAgeOver14: agreements.ageOver14,
          agreedMarketing: agreements.marketing,
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
        agreedTerms: agreements.terms,
        agreedPrivacy: agreements.privacy,
        agreedAgeOver14: agreements.ageOver14,
        agreedMarketing: agreements.marketing,
      });
      setIsSignUpComplete(true);
    } catch (err) {
      notifyApiError(err, oauthCtx ? '소셜 가입 완료에 실패했습니다.' : '회원가입에 실패했습니다.');
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

  const openTerms = (kind: 'service' | 'privacy') => {
    if (!terms) return;
    setModal({
      title: kind === 'service' ? '서비스 이용약관' : '개인정보처리방침',
      body: terms.bodies[kind] ?? '약관 본문을 불러오지 못했습니다.',
    });
  };

  // "모두 동의" 체크. 셋이 다 켜져 있으면 켜진 것으로 표시 (마케팅까지 포함은 일부러 분리).
  const allRequiredAgreed = agreements.terms && agreements.privacy && agreements.ageOver14;

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex items-center justify-center p-4">
      <div className="w-full">
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
            {providerLabel} 로그인으로 확인된 이메일{' '}
            <span className="font-semibold">{oauthCtx.email}</span> 로 가입합니다. 닉네임과 약관 동의만 완료하면 끝!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* 아이디 — 표준 가입 전용. OAuth 모드는 백엔드가 내부 username 을 자동 생성하므로 입력 자체를 노출하지 않는다. */}
          {!oauthCtx && (
            <div className="space-y-2">
              <Label htmlFor="signup-id" className="text-gray-700">아이디</Label>
              <Input
                id="signup-id"
                type="text"
                placeholder="3~50자 사이의 아이디"
                autoComplete="username"
                value={formData.id}
                onChange={(e) => updateField('id', e.target.value)}
                aria-invalid={errors.id !== undefined}
                aria-describedby="signup-id-message"
                className="h-12 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
              />
              <FieldMessage
                id="signup-id-message"
                error={errors.id}
                status={checkStatus.id === 'available' ? '사용 가능한 아이디입니다.' : null}
                statusKind={checkStatus.id === 'taken' ? 'error' : 'ok'}
                statusError={checkStatus.id === 'taken' ? '이미 사용 중인 아이디입니다.' : null}
              />
            </div>
          )}

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
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    aria-invalid={errors.password !== undefined}
                    aria-describedby="signup-password-message signup-password-hint"
                    className="h-12 pr-10 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p id="signup-password-hint" className="text-xs text-gray-500">{passwordHint}</p>
                <FieldMessage id="signup-password-message" error={errors.password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password-confirm" className="text-gray-700">비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="signup-password-confirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    autoComplete="new-password"
                    value={formData.passwordConfirm}
                    onChange={(e) => updateField('passwordConfirm', e.target.value)}
                    aria-invalid={errors.passwordConfirm !== undefined}
                    aria-describedby="signup-password-confirm-message"
                    className="h-12 pr-10 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    aria-label={showPasswordConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
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

          <div className="space-y-2">
            <Label htmlFor="signup-nickname" className="text-gray-700">닉네임</Label>
            <Input
              id="signup-nickname"
              type="text"
              placeholder={oauthCtx?.nicknameHint || '최대 30자, 표시 이름'}
              maxLength={30}
              value={formData.nickname}
              onChange={(e) => updateField('nickname', e.target.value)}
              className="h-12 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          {/* 이메일 — OAuth 모드는 readonly */}
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
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  aria-invalid={errors.email !== undefined}
                  aria-describedby="signup-email-message"
                  className="h-12 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                />
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

          {/* 동의 4종 (필수 3 + 선택 1) */}
          <fieldset className="pt-4 space-y-3 border-t border-gray-200">
            <legend className="text-sm font-semibold text-gray-700 pb-2">약관 동의</legend>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agree-all"
                checked={allRequiredAgreed && agreements.marketing}
                onCheckedChange={(checked) => {
                  const value = Boolean(checked);
                  setAgreements({ terms: value, privacy: value, ageOver14: value, marketing: value });
                  setErrors((prev) => ({ ...prev, agreements: undefined }));
                }}
                className="border-gray-300 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
              />
              <label htmlFor="agree-all" className="text-sm font-medium text-gray-900 cursor-pointer">
                모두 동의 (선택 항목 포함)
              </label>
            </div>

            <AgreementRow
              id="agree-terms"
              required
              checked={agreements.terms}
              onChange={(value) => setAgreements((prev) => ({ ...prev, terms: value }))}
              label="이용약관에 동의합니다"
              detailLabel="이용약관"
              onOpen={() => openTerms('service')}
            />
            <AgreementRow
              id="agree-privacy"
              required
              checked={agreements.privacy}
              onChange={(value) => setAgreements((prev) => ({ ...prev, privacy: value }))}
              label="개인정보처리방침에 동의합니다"
              detailLabel="개인정보처리방침"
              onOpen={() => openTerms('privacy')}
            />
            <AgreementRow
              id="agree-age"
              required
              checked={agreements.ageOver14}
              onChange={(value) => setAgreements((prev) => ({ ...prev, ageOver14: value }))}
              label="만 14세 이상입니다"
            />
            <AgreementRow
              id="agree-marketing"
              checked={agreements.marketing}
              onChange={(value) => setAgreements((prev) => ({ ...prev, marketing: value }))}
              label="마케팅 정보 수신에 동의합니다"
            />
            <FieldMessage error={errors.agreements} />
          </fieldset>

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

      {modal && <TermsModal title={modal.title} body={modal.body} onClose={() => setModal(null)} />}
    </div>
  );
}

interface AgreementRowProps {
  id: string;
  checked: boolean;
  required?: boolean;
  label: string;
  detailLabel?: string;
  onChange: (checked: boolean) => void;
  onOpen?: () => void;
}

function AgreementRow({ id, checked, required, label, detailLabel, onChange, onOpen }: AgreementRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onChange(Boolean(value))}
          className="border-gray-300 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
        />
        <label htmlFor={id} className="text-sm text-gray-700 cursor-pointer">
          <span className={required ? 'text-red-500 mr-1' : 'text-gray-400 mr-1'}>
            {required ? '[필수]' : '[선택]'}
          </span>
          {label}
        </label>
      </div>
      {detailLabel && onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="text-xs text-brand-600 hover:text-brand-700 underline"
        >
          {detailLabel} 보기
        </button>
      )}
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
