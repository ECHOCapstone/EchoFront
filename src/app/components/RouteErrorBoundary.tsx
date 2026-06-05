// 라우트 렌더 도중 발생한 예외를 받는 errorElement. react-router 가 라우트 컴포넌트의
// 렌더 에러를 이 곳으로 보내며, 공용 ErrorFallback 으로 흰 화면을 대체한다.

import { useRouteError, isRouteErrorResponse } from 'react-router';
import ErrorFallback from './ErrorFallback';

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);
  return <ErrorFallback detail={detail} />;
}
