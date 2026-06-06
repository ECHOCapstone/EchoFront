// 약관 본문을 풀스크린 모달로 표시한다. SignUp 의 "약관 보기 / 개인정보처리방침 보기" 링크가 호출한다.
// 본문은 GET /api/legal/terms 로 한 번 받아 둔 결과를 재활용한다.

import { X } from 'lucide-react';

interface Props {
  title: string;
  body: string;
  onClose: () => void;
}

export default function TermsModal({ title, body, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        {/* whitespace-pre-wrap 으로 마크다운 그대로 표시. 본격 마크다운 렌더는 후속 작업으로 분리. */}
        <pre className="px-5 py-4 overflow-y-auto text-sm text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">
          {body}
        </pre>
      </div>
    </div>
  );
}
