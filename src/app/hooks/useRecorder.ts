// 브라우저 MediaRecorder API 래퍼. start/stop 두 호출만으로 audio Blob 을 얻을 수 있게 한다.
// stop 결과는 항상 16-bit PCM WAV 로 변환되어 모델 서버가 그대로 읽을 수 있다.
// 권한 거부, 미지원 브라우저, 런타임 에러는 status 와 errorMessage 로 표면화한다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { blobToWav } from './wavEncoder';

export type RecorderStatus = 'idle' | 'recording' | 'stopping' | 'denied' | 'unsupported' | 'error';

type StopResult = { blob: Blob; mimeType: string; durationMs: number } | null;

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const stopResolverRef = useRef<((value: StopResult) => void) | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    if (status === 'recording' || status === 'stopping') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      setStatus('unsupported');
      setErrorMessage('이 브라우저는 녹음 기능을 지원하지 않습니다.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        const rawBlob = new Blob(chunksRef.current, { type: finalMime });
        const durationMs = Date.now() - startedAtRef.current;
        cleanupStream();
        const resolver = stopResolverRef.current;
        stopResolverRef.current = null;
        // 압축 포맷(webm/opus 등) 을 모델 서버가 읽을 수 있는 WAV 로 변환한다.
        blobToWav(rawBlob)
          .then((wav) => {
            setStatus('idle');
            resolver?.({ blob: wav, mimeType: 'audio/wav', durationMs });
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : '오디오 디코딩 실패';
            setStatus('error');
            setErrorMessage(message);
            resolver?.(null);
          });
      };
      recorder.onerror = (event) => {
        const message = (event as unknown as { error?: { message?: string } }).error?.message ?? '녹음 중 오류 발생';
        cleanupStream();
        setStatus('error');
        setErrorMessage(message);
        const resolver = stopResolverRef.current;
        stopResolverRef.current = null;
        resolver?.(null);
      };

      startedAtRef.current = Date.now();
      recorder.start();
      setStatus('recording');
      setErrorMessage(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : '마이크 접근이 거부되었습니다.';
      setStatus('denied');
      setErrorMessage(message);
    }
  }, [status, cleanupStream]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return null;
    }
    setStatus('stopping');
    return new Promise<StopResult>((resolve) => {
      stopResolverRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupStream();
    setStatus('idle');
    const resolver = stopResolverRef.current;
    stopResolverRef.current = null;
    resolver?.(null);
  }, [cleanupStream]);

  useEffect(() => () => cancel(), [cancel]);

  return {
    status,
    errorMessage,
    isRecording: status === 'recording',
    start,
    stop,
    cancel,
  };
}
