// 온보딩 투어의 노출 정책과 완료 영속을 한곳에 모은다(SSOT).
//   - "온보딩 완료" 여부의 진실은 백엔드(user.onboardingCompleted)다. 완료 시 PATCH 로 영속한다.
//   - 기기별 "이 투어는 이미 봤다" 가드만 localStorage 에 둔다 — 완료 플래그가 켜지기 전 같은 투어가
//     반복 노출되는 것을 막기 위한 보조 수단이지, 완료 상태의 저장소가 아니다(계정별 키로 분리).
//   - 홈 투어 완료 후 첫 발음 연습 화면에서 후속 투어가 이어지고, 그 시점에 완료가 확정된다.
//   - 프로필의 "다시 보기" 는 완료 여부와 무관하게 홈 투어를 1회 재생한다(영속 변경 없음).

import { useEffect, useRef, useState } from 'react';
import { authApi } from '../api';
import { useAuth } from '../auth/useAuth';
import { HOME_TOUR_STEPS, PRACTICE_TOUR_STEPS, type TourStep } from './onboardingSteps';
import type { TourEndReason } from './OnboardingTour';

type TourId = 'home' | 'practice';

const SEEN_KEY = (userId: number) => `echo.onboarding.seen.${userId}`;
const REPLAY_KEY = 'echo.onboarding.replay';

function readSeen(userId: number): Set<TourId> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(userId));
    return new Set(raw ? (JSON.parse(raw) as TourId[]) : []);
  } catch {
    return new Set();
  }
}

function markSeen(userId: number, id: TourId): void {
  try {
    const seen = readSeen(userId);
    seen.add(id);
    localStorage.setItem(SEEN_KEY(userId), JSON.stringify([...seen]));
  } catch {
    // localStorage 비활성화 환경(시크릿/임베디드)에서는 가드 없이도 동작한다.
  }
}

// 프로필 "다시 보기" 가 호출한다. 홈으로 이동하면 홈 투어가 1회 재생된다.
export function requestTutorialReplay(): void {
  try {
    sessionStorage.setItem(REPLAY_KEY, '1');
  } catch {
    /* noop */
  }
}

function consumeReplay(): boolean {
  try {
    if (sessionStorage.getItem(REPLAY_KEY) === '1') {
      sessionStorage.removeItem(REPLAY_KEY);
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}

export type OnboardingTourBinding = {
  steps: TourStep[];
  run: boolean;
  onEnd: (reason: TourEndReason) => void;
};

// 홈(/main)용 투어 바인딩. 신규 사용자에게 자동 노출하고, "다시 보기" 요청이면 완료 여부와 무관하게 재생한다.
export function useHomeTour(): OnboardingTourBinding {
  const { user, setUser } = useAuth();
  const [run, setRun] = useState(false);
  const replayingRef = useRef(false);
  const decidedRef = useRef(false);

  useEffect(() => {
    if (decidedRef.current || !user) return;
    decidedRef.current = true;
    if (consumeReplay()) {
      replayingRef.current = true;
      setRun(true);
      return;
    }
    if (!user.onboardingCompleted && !readSeen(user.id).has('home')) {
      setRun(true);
    }
  }, [user]);

  const onEnd = (reason: TourEndReason) => {
    setRun(false);
    if (!user) return;
    if (replayingRef.current) {
      replayingRef.current = false;
      return; // 재생 모드는 영속 상태를 바꾸지 않는다.
    }
    markSeen(user.id, 'home');
    // 건너뛰기 = 온보딩 전체를 그만두겠다는 의사 → 즉시 완료로 영속해 후속 투어도 멈춘다.
    // 정상 완료 = 다음 단계(첫 발음 연습)로 이어지므로 완료는 그 시점에 확정한다.
    if (reason === 'skipped') {
      void persistCompletion(setUser);
    }
  };

  return { steps: HOME_TOUR_STEPS, run, onEnd };
}

// 첫 발음 연습 화면용 투어 바인딩. 홈 투어를 본 신규 사용자가 처음 연습 화면에 들어오면 이어서 노출하고,
// 끝나면 온보딩 완료를 확정한다.
export function usePracticeTour(): OnboardingTourBinding {
  const { user, setUser } = useAuth();
  const [run, setRun] = useState(false);
  const decidedRef = useRef(false);

  useEffect(() => {
    if (decidedRef.current || !user) return;
    decidedRef.current = true;
    const seen = readSeen(user.id);
    if (!user.onboardingCompleted && seen.has('home') && !seen.has('practice')) {
      setRun(true);
    }
  }, [user]);

  const onEnd = () => {
    setRun(false);
    if (!user) return;
    markSeen(user.id, 'practice');
    void persistCompletion(setUser); // 완료/건너뛰기 모두 온보딩을 마무리한다.
  };

  return { steps: PRACTICE_TOUR_STEPS, run, onEnd };
}

// 완료를 백엔드에 영속하고 전역 사용자 상태를 갱신한다. 저장 실패는 앱 사용에 치명적이지 않으므로
// 조용히 넘어가고(다음 로그인 때 재시도됨) 무한 재노출만 막는다.
async function persistCompletion(setUser: (user: import('../api').User) => void): Promise<void> {
  try {
    const updated = await authApi.completeOnboarding();
    setUser(updated);
  } catch (e) {
    console.warn('온보딩 완료 저장에 실패했습니다. 다음 접속 시 다시 시도합니다.', e);
  }
}
