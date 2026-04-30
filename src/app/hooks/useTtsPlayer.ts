// TTS 재생 단일 hook. 모델 서버 /tts 응답 blob 을 임시 URL 로 재생하고
// 재생 종료 또는 컴포넌트 unmount 시 URL 자원을 회수한다.
//
// 동시에 여러 텍스트를 재생하려는 경우 마지막 호출이 우선이며, 진행 중이던 재생은
// stop() 로 정리된다. 호출자는 play(text) 한 가지만 사용하면 된다.

import { useCallback, useEffect, useRef } from 'react';
import { ttsApi } from '../api';
import { notifyApiError } from '../lib/notify';

export function useTtsPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const play = useCallback(
    async (text: string | null | undefined) => {
      if (!text || !text.trim()) return;
      try {
        const blob = await ttsApi.synthesize(text);
        stop();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.addEventListener('ended', () => {
          if (urlRef.current === url) {
            URL.revokeObjectURL(url);
            urlRef.current = null;
            audioRef.current = null;
          }
        });
        urlRef.current = url;
        audioRef.current = audio;
        await audio.play();
      } catch (err) {
        notifyApiError(err, '음성 재생에 실패했습니다.');
      }
    },
    [stop]
  );

  useEffect(() => () => stop(), [stop]);

  return { play, stop };
}
