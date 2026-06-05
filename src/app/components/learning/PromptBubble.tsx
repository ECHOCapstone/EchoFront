// 봇의 안내/녹음 권유 말풍선. 안내 문구 + (있으면) 예시 음성 듣기 버튼을 보여주고,
// 현재 활성 RECORD 단계일 때만 녹음 버튼과 안내 문구를 추가로 노출한다.

import { Volume2 } from 'lucide-react';
import { BotBubble } from '../ChatBubble';
import RecordButton from '../RecordButton';
import type { LearningPrompt } from './LearningChatFlow';

interface PromptBubbleProps {
  prompt: LearningPrompt;
  // 이 prompt 가 현재 녹음 가능한 활성 단계인지. true 일 때만 녹음 UI 를 노출한다.
  isActive: boolean;
  isRecording: boolean;
  busy: boolean;
  onPlayTts: (text: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export default function PromptBubble({
  prompt,
  isActive,
  isRecording,
  busy,
  onPlayTts,
  onStartRecording,
  onStopRecording,
}: PromptBubbleProps) {
  return (
    <BotBubble>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-base text-gray-900 leading-relaxed flex-1">
          {prompt.instruction}
          {prompt.target && <span className="block mt-2 text-lg font-bold">{prompt.target}</span>}
        </p>
        {prompt.ttsText && (
          <button
            onClick={() => onPlayTts(prompt.ttsText as string)}
            className="p-2 bg-brand-500 hover:bg-brand-600 rounded-full transition-colors flex-shrink-0"
            aria-label="예시 음성 듣기"
          >
            <Volume2 size={18} className="text-white" />
          </button>
        )}
      </div>
      {isActive && (
        <>
          <p className="mb-2 text-xs text-gray-500 leading-snug">
            💡 카운트다운이 끝나면 또렷하고 <span className="font-semibold text-gray-700">크게</span> 발음해 주세요. 조용한 곳일수록 인식이 정확해요.
          </p>
          <RecordButton
            isRecording={isRecording}
            busy={busy}
            onStart={onStartRecording}
            onStop={onStopRecording}
            busyLabel="업로드 중..."
          />
        </>
      )}
    </BotBubble>
  );
}
