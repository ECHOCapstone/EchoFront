// 동시에 두 곳에서 마이크를 잡으려는 시도를 막는 전역 잠금.
// 종합 피드백의 PracticeItemCard 가 여러 개 동시 마운트되는 경우, 사용자가 실수로 두 카드를
// 거의 동시에 누르면 두 카드가 모두 getUserMedia 를 호출해 충돌할 수 있다 (브라우저별 동작 차이).
// 이 잠금은 "지금 어떤 카드가 녹음 중인가" 를 React Context 로 단일 출처 관리해 그 시도를 차단한다.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// 외부 노출 인터페이스 — 4 메서드로 잠금의 모든 시나리오를 표현한다.
interface RecordingLock {
  // 현재 잠금을 보유한 카드 식별자. null 이면 자유.
  ownerKey: string | null;
  // 호출자가 잠금을 시도한다. 잡으면 true, 다른 카드가 이미 가지고 있으면 false.
  acquire: (key: string) => boolean;
  // 자신의 잠금을 푼다. 다른 카드의 키로 호출되면 무시 — 무관한 카드가 해제하지 못한다.
  release: (key: string) => void;
  // 잠금 보유자가 아닌 카드가 "지금 녹음할 수 있는지" 빠르게 확인할 때 쓴다.
  isAvailableFor: (key: string) => boolean;
}

const RecordingLockContext = createContext<RecordingLock | null>(null);

export function RecordingLockProvider({ children }: { children: ReactNode }) {
  // ref 와 state 를 함께 둔다: acquire 의 동기 판정에는 ref 가, 리렌더 트리거에는 state 가 쓰인다.
  const ownerRef = useRef<string | null>(null);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);

  const acquire = useCallback((key: string) => {
    if (ownerRef.current !== null && ownerRef.current !== key) {
      return false;
    }
    ownerRef.current = key;
    setOwnerKey(key);
    return true;
  }, []);

  const release = useCallback((key: string) => {
    if (ownerRef.current !== key) return;
    ownerRef.current = null;
    setOwnerKey(null);
  }, []);

  const isAvailableFor = useCallback(
    (key: string) => ownerRef.current === null || ownerRef.current === key,
    [],
  );

  const value = useMemo(
    () => ({ ownerKey, acquire, release, isAvailableFor }),
    [ownerKey, acquire, release, isAvailableFor],
  );

  return <RecordingLockContext.Provider value={value}>{children}</RecordingLockContext.Provider>;
}

// Provider 가 없는 환경에서도 안전하게 동작하도록 폴백 — 잠금 없음으로 간주한다.
const NO_LOCK: RecordingLock = {
  ownerKey: null,
  acquire: () => true,
  release: () => {},
  isAvailableFor: () => true,
};

export function useRecordingLock(): RecordingLock {
  const ctx = useContext(RecordingLockContext);
  return ctx ?? NO_LOCK;
}
