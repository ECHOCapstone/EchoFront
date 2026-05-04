// 컴포넌트 마운트 후 한 번 또는 deps 변경 시마다 비동기 fetch 를 수행하는 공용 hook.
//
// 화면별 로딩 / 에러 / cancellation 처리가 한 곳에 있다. 같은 코드를 7~8 곳에서 반복하지 않게 한다.
//   - data        : 가장 마지막 성공 응답. 첫 fetch 가 끝나기 전엔 null.
//   - loading     : fetch 진행 여부.
//   - error       : 가장 마지막 실패 메시지. 다음 deps 변경 또는 reload() 호출 시 비워진다.
//   - reload()    : 같은 fetcher 를 즉시 다시 실행한다.
//   - setData(...) : 화면 내 즉시 갱신 후 응답을 다시 받지 않아도 될 때 (낙관적 업데이트) 사용.
//
// 사용 패턴:
//   const { data, loading, error } = useApiResource(
//     () => tracksApi.list(),
//     [],
//     { errorFallback: '학습 트랙을 불러오지 못했습니다.' }
//   );

import { useCallback, useEffect, useState } from 'react';
import { ApiException } from '../api';

interface Options<T> {
  // setError 대신 호출되는 폴백. notify 토스트 등을 호출하는 화면에서 사용.
  onError?: (err: unknown) => void;
  // ApiException 메시지가 비어 있을 때 노출할 문구. onError 가 지정되면 무시된다.
  errorFallback?: string;
  // false 면 첫 fetch 를 스킵한다. 의존 값이 준비되지 않았을 때 (예: id null) 사용.
  enabled?: boolean;
  // 응답 도착 전의 데이터 자리값. 보통 null 이지만, 화면이 빈 배열을 빠르게 그려야 할 때 [] 등으로 둔다.
  initialData?: T | null;
}

interface Result<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (next: T | null) => void;
}

export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  options: Options<T> = {}
): Result<T> {
  const { onError, errorFallback, enabled = true, initialData = null } = options;
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((value) => {
        if (cancelled) return;
        setData(value);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (onError) {
          onError(err);
          return;
        }
        const message = err instanceof ApiException
          ? err.message
          : (errorFallback ?? '데이터를 불러오지 못했습니다.');
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // fetcher 와 옵션은 caller 가 의도한 deps 로만 재실행한다. 안정 fetcher 가 아니라도 deps 가 동일하면 한 번만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  return { data, loading, error, reload, setData };
}
