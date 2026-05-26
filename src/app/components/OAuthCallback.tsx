// 백엔드 OAuth2 성공/실패 redirect 의 착지점.
//
// 성공: URL fragment `#token=<JWT>&expiresIn=<sec>` 로 도착한다. fragment 는 서버로 송신되지 않아
//       Referer 로그에 토큰이 새지 않는다. 토큰을 localStorage 에 저장하고 me() 로 사용자 정보를
//       채운 뒤 메인으로 이동한다.
// 실패: 백엔드는 frontendErrorUri (=/login?oauthError=<code>) 로 직접 redirect 하므로 이 컴포넌트가
//       에러를 처리할 일은 없다. fragment 파싱 자체가 실패하는 비정상 케이스만 로그인으로 fallback.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { acceptOAuthToken } = useAuth();
  // StrictMode 의 이중 mount 환경에서 acceptOAuthToken 이 두 번 호출되어 me() 가 중복 실행되지 않게 가드.
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const token = params.get('token');

    if (!token) {
      navigate(`${paths.login}?oauthError=missing_token`, { replace: true });
      return;
    }

    // 토큰이 url 에 남지 않도록 hash 를 제거한 뒤 인증을 진행한다.
    window.history.replaceState(null, '', window.location.pathname);

    (async () => {
      try {
        await acceptOAuthToken(token);
        navigate(paths.main, { replace: true });
      } catch (err) {
        notifyApiError(err, 'Google 로그인 처리에 실패했습니다.');
        navigate(`${paths.login}?oauthError=session_failed`, { replace: true });
      }
    })();
  }, [acceptOAuthToken, navigate]);

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="mt-4 text-gray-700 font-medium">로그인 처리 중...</p>
      </div>
    </div>
  );
}
