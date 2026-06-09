// 코치마크 투어를 그리는 얇은 래퍼. 투어 진행/스포트라이트/위치계산/스크롤은 react-joyride 에 위임하고,
// 이 컴포넌트는 스텝 매핑, 브랜드 스타일, 한국어 라벨, 종료 콜백만 책임진다(SRP).
// 종료 사유(완료/건너뛰기)만 상위로 올려, 완료 상태 영속 정책은 호출 측(useOnboarding)이 갖게 한다.

import { useMemo } from 'react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';
import type { TourStep } from './onboardingSteps';

export type TourEndReason = 'finished' | 'skipped';

interface OnboardingTourProps {
  steps: TourStep[];
  run: boolean;
  onEnd: (reason: TourEndReason) => void;
}

// 앱의 브랜드 색(brand-500 계열). 다이얼로그/모달(z-50) 위에 확실히 뜨도록 zIndex 를 높게 둔다.
const BRAND = '#4F86F7';

const LOCALE = { back: '이전', close: '닫기', last: '시작하기', next: '다음', skip: '건너뛰기' };

function toJoyrideSteps(steps: TourStep[]): Step[] {
  return steps.map((s) => ({
    target: s.target,
    title: s.title,
    content: s.content,
    placement: s.placement,
    // 첫 스텝부터 비콘 없이 바로 말풍선을 띄워 안내가 즉시 시작되게 한다.
    disableBeacon: true,
  }));
}

export default function OnboardingTour({ steps, run, onEnd }: OnboardingTourProps) {
  // 매 렌더마다 새 배열을 넘기면 Joyride 가 투어를 재초기화할 수 있어, steps 가 바뀔 때만 다시 매핑한다.
  const joyrideSteps = useMemo(() => toJoyrideSteps(steps), [steps]);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED) {
      onEnd('finished');
    } else if (status === STATUS.SKIPPED) {
      onEnd('skipped');
    }
  };

  return (
    <Joyride
      steps={joyrideSteps}
      run={run}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      scrollToFirstStep
      locale={LOCALE}
      callback={handleCallback}
      styles={{
        options: { primaryColor: BRAND, zIndex: 10000, arrowColor: '#FFFFFF' },
        tooltipTitle: { fontWeight: 800 },
        buttonNext: { fontWeight: 700, borderRadius: 10 },
        buttonBack: { color: '#5A6473' },
        buttonSkip: { color: '#8A93A3' },
      }}
    />
  );
}
