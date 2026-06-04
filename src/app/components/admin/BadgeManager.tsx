// 시스템 누적/스트릭 배지 관리. 챕터 단위 mastery 배지(트랙 → 챕터 ScriptForm 에서 입력) 와는 별개로,
// 사용자 통계 페이지의 큰 배지 (예: "첫 피드백", "7일 연속 학습") 를 어드민이 add / edit / delete 한다.
// condition 종류는 백엔드 BadgeCondition enum 이 정한다 — availableConditions 응답을 그대로 select 에 노출.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi, type Badge, type BadgeCatalog, type BadgeInput, type SeedFileStatus } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';
import SeedPersistActions from './SeedPersistActions';

// 빈 폼의 초깃값. condition 의 기본 선택은 catalog 응답을 받은 뒤 첫 항목으로 자동 채워진다.
const EMPTY_FORM: BadgeInput = { id: '', name: '', condition: '', threshold: 1 };

const CONDITION_HINT: Record<string, string> = {
  COMPLETED_FEEDBACK_COUNT: '챕터 종합 피드백 N건 이상 완료',
  USER_STREAK: '연속 학습 N일 이상 유지',
  TOTAL_EXP: '누적 EXP N점 이상',
  RECORDING_COUNT: '누적 녹음 N건 이상',
};

export default function BadgeManager() {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.listBadges(),
    [],
    {
      errorFallback: '배지를 불러오지 못했습니다.',
      initialData: { badges: [], availableConditions: [] } as BadgeCatalog,
    }
  );
  const catalog = data ?? { badges: [], availableConditions: [] };

  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [form, setForm] = useState<BadgeInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [seedStatus, setSeedStatus] = useState<SeedFileStatus | null>(null);

  useEffect(() => {
    // 부팅 직후 한 번. 영구 저장본 상태는 SeedPersistActions 가 행동 후 갱신.
    adminApi
      .listBadges()
      .then(() => {
        // catalog 가 SeedFileStatus 자체를 노출하지 않으므로 별도 endpoint 가 없을 땐 null 로 둔다.
        // SystemStatus 의 seedFiles 에서도 확인 가능하지만 매니저 화면 우상단 표시 용으로는 SeedPersistActions
        // 의 응답으로 충분하다.
        setSeedStatus(null);
      })
      .catch(() => setSeedStatus(null));
  }, []);

  const openCreate = () => {
    const defaultCondition = catalog.availableConditions[0] ?? '';
    setForm({ ...EMPTY_FORM, condition: defaultCondition });
    setEditing('new');
  };

  const openEdit = (badge: Badge) => {
    setForm({
      id: badge.id,
      name: badge.name,
      condition: badge.condition,
      threshold: badge.threshold,
    });
    setEditing(badge.id);
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmedId = form.id.trim();
    const trimmedName = form.name.trim();
    if (!trimmedId || !trimmedName || !form.condition) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await adminApi.createBadge({
          id: trimmedId,
          name: trimmedName,
          condition: form.condition,
          threshold: form.threshold,
        });
        setData((prev) => ({
          badges: [...(prev?.badges ?? []), created],
          availableConditions: prev?.availableConditions ?? [],
        }));
        toast.success('배지를 추가했습니다.');
      } else if (typeof editing === 'string') {
        const updated = await adminApi.updateBadge(editing, {
          id: editing,
          name: trimmedName,
          condition: form.condition,
          threshold: form.threshold,
        });
        setData((prev) => ({
          badges: (prev?.badges ?? []).map((b) => (b.id === updated.id ? updated : b)),
          availableConditions: prev?.availableConditions ?? [],
        }));
        toast.success('배지를 수정했습니다.');
      }
      setEditing(null);
    } catch (err) {
      notifyApiError(err, '배지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (badge: Badge) => {
    if (!confirm(`"${badge.name}" 배지를 삭제하시겠습니까?`)) return;
    try {
      await adminApi.deleteBadge(badge.id);
      setData((prev) => ({
        badges: (prev?.badges ?? []).filter((b) => b.id !== badge.id),
        availableConditions: prev?.availableConditions ?? [],
      }));
      toast.success('배지를 삭제했습니다.');
    } catch (err) {
      notifyApiError(err, '배지 삭제에 실패했습니다.');
    }
  };

  const handlePersist = async () => {
    const next = await adminApi.persistBadges();
    toast.success('현재 배지 정의를 영구 저장했습니다.');
    return next;
  };

  const handleResetBadges = async () => {
    const next = await adminApi.resetBadgesToDefaults();
    const fresh = await adminApi.listBadges();
    setData(() => fresh);
    toast.success('배지를 공장 기본값으로 되돌렸습니다.');
    return next;
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">배지</h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-1 h-9 px-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0"
          >
            <Plus size={16} /> 추가
          </button>
        </div>
        <SeedPersistActions
          status={seedStatus}
          persist={handlePersist}
          reset={handleResetBadges}
          resetConfirmMessage="현재 배지 정의를 비우고 공장 기본값(application.yaml) 으로 되돌립니다. 진행하시겠습니까?"
          onStatusChange={setSeedStatus}
        />
      </div>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {editing !== null && (
        <div className="mb-4 p-4 bg-brand-50 rounded-xl space-y-3">
          <label className="block text-sm text-gray-600">
            배지 ID (영문 대문자/숫자/언더스코어 권장)
            <input
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              disabled={editing !== 'new'}
              placeholder="예: FIRST_FEEDBACK"
              className="w-full h-10 px-3 mt-1 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
            />
          </label>
          <label className="block text-sm text-gray-600">
            배지 이름 (학습자가 보는 한국어)
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 첫 피드백"
              className="w-full h-10 px-3 mt-1 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white"
            />
          </label>
          <label className="block text-sm text-gray-600">
            달성 조건
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="w-full h-10 px-3 mt-1 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white"
            >
              {catalog.availableConditions.length === 0 && <option value="">불러오는 중...</option>}
              {catalog.availableConditions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {form.condition && CONDITION_HINT[form.condition] && (
              <span className="block text-xs text-gray-500 mt-1">{CONDITION_HINT[form.condition]}</span>
            )}
          </label>
          <label className="block text-sm text-gray-600">
            임계값 (N)
            <input
              type="number"
              min={0}
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
              className="w-full h-10 px-3 mt-1 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.id.trim() || !form.name.trim() || !form.condition}
              className="flex-1 h-10 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex-1 h-10 bg-white border-2 border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!loading && catalog.badges.length === 0 && (
          <p className="text-gray-500 text-sm">아직 배지가 없습니다. 우측 상단 추가 버튼을 눌러 만들어 주세요.</p>
        )}
        {catalog.badges.map((badge) => (
          <div
            key={badge.id}
            className="flex items-center gap-1 p-3 border-2 border-gray-200 rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{badge.name}</p>
              <p className="text-xs text-gray-500 font-mono">
                {badge.id} · {badge.condition} ≥ {badge.threshold}
              </p>
            </div>
            <button
              onClick={() => openEdit(badge)}
              aria-label={`${badge.name} 수정`}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Pencil size={16} className="text-gray-600" />
            </button>
            <button
              onClick={() => handleDelete(badge)}
              aria-label={`${badge.name} 삭제`}
              className="p-2 hover:bg-red-50 rounded-full transition-colors"
            >
              <Trash2 size={16} className="text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
