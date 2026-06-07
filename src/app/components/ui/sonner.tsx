"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

// 앱은 라이트 테마 한 가지만 지원하므로 sonner 테마를 명시적으로 "light" 로 고정한다.
// next-themes 의 system 모드를 쓰면 ThemeProvider 가 없는 환경에서 OS 다크모드 사용자에게 어둡게
// 노출되어 토스트가 배경과 어울리지 않게 보인다.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
