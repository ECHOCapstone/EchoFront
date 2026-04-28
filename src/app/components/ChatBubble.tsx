import type { ReactNode } from 'react';

// 봇(피드백) 말풍선 - 왼쪽 정렬 + 캐릭터 이미지 자리 + 꼬리
export function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {/* 캐릭터 이미지 자리 (추후 삽입 예정) */}
      <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0" />

      {/* 말풍선 + 왼쪽 꼬리 */}
      <div className="relative flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ml-2">
        {/* 말풍선 꼬리 (테두리용 바깥 삼각형) */}
        <span
          className="absolute top-3 -left-2 w-0 h-0
                     border-t-[8px] border-t-transparent
                     border-b-[8px] border-b-transparent
                     border-r-[9px] border-r-gray-200"
        />
        {/* 말풍선 꼬리 (내부 흰색 삼각형) */}
        <span
          className="absolute top-3 -left-[7px] w-0 h-0
                     border-t-[7px] border-t-transparent
                     border-b-[7px] border-b-transparent
                     border-r-[8px] border-r-white"
        />
        {children}
      </div>
    </div>
  );
}

// 사용자 말풍선 - 오른쪽 정렬 + 꼬리
export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="relative max-w-[75%] bg-sky-500 text-white rounded-2xl px-4 py-3 shadow-sm mr-2">
        {/* 말풍선 꼬리 (오른쪽) */}
        <span
          className="absolute top-3 -right-2 w-0 h-0
                     border-t-[8px] border-t-transparent
                     border-b-[8px] border-b-transparent
                     border-l-[9px] border-l-sky-500"
        />
        <p className="text-base font-medium">{children}</p>
      </div>
    </div>
  );
}
