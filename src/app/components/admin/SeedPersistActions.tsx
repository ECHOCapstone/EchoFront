// 매니저 화면 우상단의 영구 저장 / 시드 재적용 액션 영역. 모든 도메인이 같은 시각 언어를 쓰도록
// 한 컴포넌트로 통일했다.
//
//   - persist 가 주어진 도메인만 "📌 영구 저장" 버튼을 노출한다 (Track / Settings 만 해당).
//   - reset 은 모든 도메인이 가지며, 항상 confirm 한 단계를 거친 뒤 호출된다.
//   - status 가 주어지면 외부 영구 저장본의 존재 / 마지막 수정 시각을 안내한다.

import { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import type { SeedFileStatus } from '../../api';
import { notifyApiError } from '../../lib/notify';

interface SeedPersistActionsProps {
  status: SeedFileStatus | null;
  persist?: () => Promise<SeedFileStatus>;
  reset: () => Promise<SeedFileStatus | unknown>;
  resetConfirmMessage: string;
  persistLabel?: string;
  resetLabel?: string;
  onStatusChange?: (next: SeedFileStatus | null) => void;
}

export default function SeedPersistActions({
  status,
  persist,
  reset,
  resetConfirmMessage,
  persistLabel = '영구 저장',
  resetLabel = '시드 재적용',
  onStatusChange,
}: SeedPersistActionsProps) {
  const [busy, setBusy] = useState(false);

  const handlePersist = async () => {
    if (!persist || busy) return;
    setBusy(true);
    try {
      const next = await persist();
      onStatusChange?.(next);
    } catch (err) {
      notifyApiError(err, '영구 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (busy) return;
    if (!confirm(resetConfirmMessage)) return;
    setBusy(true);
    try {
      const next = await reset();
      if (next && typeof next === 'object' && 'exists' in (next as object)) {
        onStatusChange?.(next as SeedFileStatus);
      }
    } catch (err) {
      notifyApiError(err, '시드 재적용에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {persist && (
          <button
            type="button"
            onClick={handlePersist}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-brand-500 bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50"
          >
            <Save size={14} />
            <span>📌 {persistLabel}</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RotateCcw size={14} />
          <span>🔄 {resetLabel}</span>
        </button>
      </div>
      {status && (
        <p className="text-xs text-gray-500">
          {status.exists
            ? `영구 저장본 있음 · 수정 ${formatTime(status.lastModified)}`
            : '영구 저장본 없음 (공장 기본값으로 동작 중)'}
        </p>
      )}
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}
