// 지난 챌린지 히스토리 페이지. 시간 역순으로 최신 N개를 보여 주며 각 카드에 1~3등 미니뷰와
// 본인 best / 등수 / 배지가 함께 표시된다.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Medal } from 'lucide-react';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { Button } from './ui/button';
import { challengeApi } from '../api';
import type { ChallengeHistoryItem } from '../api';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';
import { BADGE_PRESET } from '../lib/challengeBadge';

export default function PastChallenges() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChallengeHistoryItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    challengeApi
      .history(30)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        notifyApiError(err, '지난 챌린지를 불러오지 못했습니다.');
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-start mb-4">
          <button
            onClick={() => navigate(paths.challenge)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">지난 챌린지</h1>

        {/* 에러는 토스트로 노출하고 본문은 빈 상태를 보여 준다 — 인라인 빨강 텍스트와 토스트 중복 회피. */}
        {!failed && !items && <p className="text-gray-500">불러오는 중...</p>}
        {failed && !items && (
          <p className="text-gray-500">지난 챌린지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        )}
        {items && items.length === 0 && (
          <p className="text-gray-500">아직 지난 챌린지가 없어요.</p>
        )}

        <div className="space-y-4">
          {items?.map((item) => <HistoryCard key={item.id} item={item} />)}
        </div>

        <div className="mt-8">
          <Button onClick={() => navigate(paths.challenge)} className="w-full h-12">
            오늘의 챌린지로 돌아가기
          </Button>
        </div>
      </div>

      <BottomNav active="challenge" />
    </div>
  );
}

// 한 챌린지의 카드. 기간 / 본문 / 본인 결과 / 1~3등 미니뷰까지 한 컨테이너에 묶는다.
function HistoryCard({ item }: { item: ChallengeHistoryItem }) {
  const period = formatPeriod(item.activatedAt, item.deactivatedAt);
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{period}</p>
      <p className="text-base font-bold text-gray-900 leading-snug mt-1">{item.targetText}</p>
      {item.koreanTranslation && (
        <p className="text-sm text-gray-500 mt-1">{item.koreanTranslation}</p>
      )}

      <div className="mt-3 flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2">
        <div>
          <p className="text-xs text-gray-500">내 결과</p>
          <p className="text-sm font-bold text-brand-700">
            {item.myBestScore !== null ? `${item.myRank}위 · ${item.myBestScore.toFixed(1)}점` : '미도전'}
          </p>
        </div>
        {item.myBadgeId && <BadgeChip badgeId={item.myBadgeId} />}
      </div>

      {item.topEntries.length > 0 && (
        <div className="mt-3 space-y-2">
          {item.topEntries.map((top) => (
            <div key={top.rank} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs flex items-center justify-center font-bold">
                  {top.rank}
                </span>
                <span className="font-medium text-gray-900">{top.nickname}</span>
                {top.badgeId && <BadgeChip badgeId={top.badgeId} compact />}
              </div>
              <span className="font-bold text-gray-700">{top.bestScore.toFixed(1)}점</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 배지 식별자별 시각 라벨. yaml 의 CHALLENGE_GOLD/SILVER/BRONZE 와 일치.
function BadgeChip({ badgeId, compact = false }: { badgeId: string; compact?: boolean }) {
  const config = BADGE_PRESET[badgeId];
  if (!config) {
    return null;
  }
  if (compact) {
    return <Medal size={14} className={config.iconColor} aria-label={config.label} />;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full ${config.bg} ${config.text}`}
    >
      <Medal size={14} className={config.iconColor} />
      {config.label}
    </span>
  );
}

function formatPeriod(activatedAt: string | null, deactivatedAt: string | null): string {
  if (!activatedAt) {
    return '기간 미정';
  }
  const start = formatDate(activatedAt);
  const end = deactivatedAt ? formatDate(deactivatedAt) : '진행 중';
  return `${start} ~ ${end}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const month = (date.getMonth() + 1).toString();
  const day = date.getDate().toString();
  return `${month}/${day}`;
}
