// 챕터 / 세션 학습 진입 시 "이어서 vs 처음부터" 분기와 prior history 로드를 한 곳에서 처리하는 훅.
// PronunciationPractice 와 SessionDetail 이 거의 동일한 로직을 갖고 있어 SSOT 로 묶었다.
//
// resumeFromIndex 의미:
//   null    — 미해결 (로딩 중 / 사용자 confirm 응답 대기). UI 는 채팅을 숨긴다.
//   0       — 처음부터 시작.
//   K > 0   — K 인덱스부터 학습 재개. priorHistory 로 0..K-1 의 시도 결과를 그려 준다.

import { useEffect, useState } from 'react';
import { progressApi, recordingsApi, type RecordingHistoryItem } from '../api';
import { useConfirm } from '../components/ConfirmProvider';

type Mode = 'chapter' | 'session';

interface UseResumeProgressInput {
  mode: Mode;
  // mode = 'chapter' 면 scriptId, 'session' 이면 sessionId. null 이면 훅이 동작하지 않는다.
  id: number | null;
}

interface ResumeProgressState {
  resumeFromIndex: number | null;
  priorHistory: Map<number, RecordingHistoryItem>;
  historicalPassThreshold: number | undefined;
}

export function useResumeProgress({ mode, id }: UseResumeProgressInput): ResumeProgressState {
  const confirm = useConfirm();
  const [resumeFromIndex, setResumeFromIndex] = useState<number | null>(0);
  const [priorHistory, setPriorHistory] = useState<Map<number, RecordingHistoryItem>>(new Map());
  const [historicalPassThreshold, setHistoricalPassThreshold] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (id === null) return;
    setResumeFromIndex(null);
    setPriorHistory(new Map());
    setHistoricalPassThreshold(undefined);
    let cancelled = false;

    const progressGet = mode === 'chapter' ? progressApi.chapter.get : progressApi.session.get;
    const progressReset = mode === 'chapter' ? progressApi.chapter.reset : progressApi.session.reset;
    const historyFetch = mode === 'chapter' ? recordingsApi.historyForScript : recordingsApi.historyForSession;

    progressGet(id)
      .then(async (progress) => {
        if (cancelled) return;
        if (!progress.exists || progress.lastCompletedIndex < 0) {
          setResumeFromIndex(0);
          return;
        }
        const proceed = await confirm({
          title: '이어서 학습',
          description: '이전 진행이 남아 있습니다. 이어서 학습하시겠습니까?',
          confirmLabel: '이어서',
          cancelLabel: '처음부터',
        });
        if (cancelled) return;
        if (proceed) {
          // 이어서 — 0..K-1 의 압축 데이터까지 받아둔 뒤에 채팅을 렌더한다.
          // history 조회 실패는 학습 자체를 막지 않는다 — 빈 history 로 startFromIndex 부터만 진행.
          try {
            const history = await historyFetch(id);
            if (cancelled) return;
            const map = new Map<number, RecordingHistoryItem>();
            for (const item of history.items) {
              map.set(item.stepId, item);
            }
            setPriorHistory(map);
            setHistoricalPassThreshold(history.passThreshold);
          } catch {
            // 빈 history 로 진입.
          }
          if (!cancelled) setResumeFromIndex(progress.lastCompletedIndex + 1);
        } else {
          await progressReset(id).catch(() => {});
          if (!cancelled) setResumeFromIndex(0);
        }
      })
      .catch(() => {
        // 진행 상태 조회 실패는 학습을 막지 않는다 — 처음부터 시작 가정.
        if (!cancelled) setResumeFromIndex(0);
      });
    return () => {
      cancelled = true;
    };
  }, [id, mode, confirm]);

  return { resumeFromIndex, priorHistory, historicalPassThreshold };
}
