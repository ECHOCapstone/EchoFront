// 단위 학습 화면 (트랙 챕터 / 맞춤 세션) 이 공통으로 필요로 하는 이탈 안전망을 모은다.
//   - 탭 닫기 / 새로고침: beforeunload 로 브라우저 표준 확인창을 띄운다.
//   - 라우터 내 이동 / 뒤로가기: history.pushState 한 번을 막아 popstate 시 사용자에게 확인을 받는다.
// "dirty" 가 true 인 경우에만 안전망이 동작하므로, 호출 측은 학습이 실제로 진행 중인 동안만 true 로 둔다.

import { useEffect } from 'react';

interface UseLearningSafeguardsOptions {
  // true 이면 새로고침 / 뒤로가기를 막고 사용자에게 확인을 받는다. 학습이 끝나면 false 로 두어 차단을 푼다.
  dirty: boolean;
  // 사용자가 라우터 이동 (뒤로가기 / 뒤로 swipe 등) 을 시도했을 때 호출되는 콜백.
  // confirm 한 줄로 동기 묻기를 권장하며, true 반환 시 호출 측이 명시적으로 navigate 한다.
  onAttemptLeave: () => void | Promise<void>;
}

// beforeunload 표준 동작: returnValue 를 설정하면 브라우저가 자체 확인창을 띄운다. 모바일 등 일부 브라우저는
// 무시할 수 있지만 표준이라 별도 폴리필 없이 안전.
function beforeUnloadGuard(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = '';
}

export function useLearningSafeguards({ dirty, onAttemptLeave }: UseLearningSafeguardsOptions): void {
  useEffect(() => {
    if (!dirty) return;
    window.addEventListener('beforeunload', beforeUnloadGuard);
    return () => window.removeEventListener('beforeunload', beforeUnloadGuard);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    // history 에 더미 state 를 한 칸 쌓아 두면, 사용자가 뒤로가기를 누를 때 그 더미 state 가 pop 되며
    // popstate 가 발생한다. 그 시점에 onAttemptLeave 를 호출해 사용자에게 확인을 받는다.
    // 사용자가 확인하면 호출 측이 navigate 로 실제 이탈을 수행한다. 거절하면 다시 더미 state 를 쌓는다.
    window.history.pushState({ __learningGuard: true }, '', window.location.href);

    const handler = () => {
      // 사용자 확인 흐름을 호출 측에 위임한다. async 라도 await 하지 않는다 — popstate 는 이미 일어났고
      // 더미 state 는 사라진 상태라 즉시 다시 한 칸 쌓아 안전망을 유지한다.
      window.history.pushState({ __learningGuard: true }, '', window.location.href);
      void onAttemptLeave();
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [dirty, onAttemptLeave]);
}
