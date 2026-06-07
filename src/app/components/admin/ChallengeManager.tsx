// 어드민 "오늘의 챌린지" 관리 패널. 새 챌린지 등록 + 활성/비활성 토글 + 통계(시도수/참여자) 조회를 한 화면에 묶는다.
// 단일 active 정책은 백엔드가 강제하므로 UI 는 단순히 "활성화" 버튼만 노출한다.

import { useEffect, useState } from 'react';
import { adminChallengeApi } from '../../api';
import type { AdminChallengeListItem } from '../../api';
import { notifyApiError, notifyError, notifySuccess } from '../../lib/notify';

export default function ChallengeManager() {
  const [items, setItems] = useState<AdminChallengeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetText, setTargetText] = useState('');
  const [koreanTranslation, setKoreanTranslation] = useState('');
  const [activateOnCreate, setActivateOnCreate] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await adminChallengeApi.list(50);
      setItems(list);
    } catch (err) {
      notifyApiError(err, '챌린지 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    const trimmed = targetText.trim();
    if (!trimmed) {
      notifyError('문장을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await adminChallengeApi.create({
        targetText: trimmed,
        koreanTranslation: koreanTranslation.trim() || undefined,
        activate: activateOnCreate,
      });
      setTargetText('');
      setKoreanTranslation('');
      notifySuccess('새 챌린지가 등록되었습니다.');
      await load();
    } catch (err) {
      notifyApiError(err, '챌린지 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: AdminChallengeListItem) => {
    try {
      if (item.active) {
        await adminChallengeApi.deactivate(item.id);
        notifySuccess('챌린지가 종료되었습니다.');
      } else {
        await adminChallengeApi.activate(item.id);
        notifySuccess('챌린지가 활성화되었습니다.');
      }
      await load();
    } catch (err) {
      notifyApiError(err, '챌린지 상태 변경에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-4 border-2 border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-3">새 챌린지 등록</h2>
        <label className="block text-sm font-medium text-gray-700 mb-1">문장 (영문)</label>
        <textarea
          value={targetText}
          onChange={(e) => setTargetText(e.target.value)}
          placeholder="It's been a while, how have you been?"
          className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm h-20 focus:border-brand-400 focus:outline-none"
        />
        <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">한국어 번역 (선택)</label>
        <input
          value={koreanTranslation}
          onChange={(e) => setKoreanTranslation(e.target.value)}
          placeholder="오랜만이네, 어떻게 지냈어?"
          className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-brand-400 focus:outline-none"
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={activateOnCreate}
            onChange={(e) => setActivateOnCreate(e.target.checked)}
          />
          등록 즉시 활성화 (이전 활성 챌린지는 자동으로 종료되고 등수별 배지가 발급됩니다)
        </label>
        <button
          onClick={handleCreate}
          disabled={submitting}
          className="mt-4 w-full h-11 bg-brand-500 text-white font-bold rounded-xl disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '등록하기'}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">등록된 챌린지</h2>
        {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-gray-500">아직 등록된 챌린지가 없어요.</p>
        )}
        <div className="space-y-3">
          {items.map((item) => (
            <ChallengeRow key={item.id} item={item} onToggle={() => handleToggleActive(item)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ChallengeRow({
  item,
  onToggle,
}: {
  item: AdminChallengeListItem;
  onToggle: () => void | Promise<void>;
}) {
  return (
    <div
      className={`rounded-2xl p-4 border-2 ${
        item.active ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-base font-bold text-gray-900 leading-snug">{item.targetText}</p>
          {item.koreanTranslation && (
            <p className="text-sm text-gray-500 mt-1">{item.koreanTranslation}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {item.active ? '활성' : '비활성'} · 시도 {item.totalAttempts}회 · 참여 {item.totalParticipants}명
          </p>
        </div>
        <button
          onClick={() => void onToggle()}
          className={`shrink-0 h-9 px-4 text-sm font-bold rounded-full transition-colors ${
            item.active
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-brand-500 text-white hover:bg-brand-600'
          }`}
        >
          {item.active ? '종료' : '활성화'}
        </button>
      </div>
    </div>
  );
}
