// 로그인된 사용자가 자기 비밀번호를 변경하는 모달.
// 정책 안내 + 새 비밀번호 확인 + 백엔드 정책 검증을 한 화면에서 처리한다.

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { authApi, type PasswordPolicy } from '../../api/auth';
import { notifyApiError } from '../../lib/notify';

const DEFAULT_POLICY: PasswordPolicy = { minLength: 8, maxLength: 100, requireCategories: 2 };

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ open, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);

  // 모달이 열릴 때 정책을 받아온다 — 닫혀 있을 때는 호출 안 함.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    authApi.passwordPolicy().then((res) => { if (!cancelled) setPolicy(res); }).catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  // 모달이 닫힐 때마다 입력 상태를 정리해 다음 사용자가 봐도 깨끗하다.
  useEffect(() => {
    if (open) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }, [open]);

  const hint = useMemo(
    () => `${policy.minLength}~${policy.maxLength}자, 영문 소문자 / 대문자 / 숫자 / 특수문자 중 ${policy.requireCategories}가지 이상 포함`,
    [policy]
  );

  // 두 칸 일치 여부 + 정책 길이 정도만 미리 안내. 카테고리 카운트 같은 깊은 검증은 백엔드가 단일 출처.
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < policy.minLength;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (mismatch || tooShort) return;
    setSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('비밀번호를 변경했습니다.');
      onClose();
    } catch (err) {
      notifyApiError(err, '비밀번호 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="비밀번호 변경"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">비밀번호 변경</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
          <PasswordField
            id="cp-current"
            label="현재 비밀번호"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
          />

          <div className="space-y-1">
            <PasswordField
              id="cp-new"
              label="새 비밀번호"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500">{hint}</p>
            {tooShort && <p className="text-xs text-red-500">새 비밀번호가 너무 짧습니다.</p>}
          </div>

          <div className="space-y-1">
            <PasswordField
              id="cp-confirm"
              label="새 비밀번호 확인"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggleShow={() => setShowConfirm((v) => !v)}
              autoComplete="new-password"
            />
            {mismatch && <p className="text-xs text-red-500">새 비밀번호가 일치하지 않습니다.</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={
                submitting
                || !currentPassword
                || !newPassword
                || !confirmPassword
                || mismatch
                || tooShort
              }
              className="flex-1 h-11 bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50"
            >
              {submitting ? '변경 중...' : '변경'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
}

function PasswordField({ id, label, value, onChange, show, onToggleShow, autoComplete }: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-700">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="h-12 pr-10 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
