// 학습자에게 노출되는 LLM 텍스트의 최소 마크업을 안전하게 렌더링한다.
// 지원 규칙:
//   - `**text**` → 굵게 (<strong>)
//   - 줄바꿈 (`\n`) → 단락 분리 (whitespace-pre-line 으로 자연스럽게 흐른다)
//   - 그 외 모든 HTML 은 텍스트로만 취급해 XSS 가능성을 차단한다 — innerHTML 사용 X.
//
// 외부 markdown 라이브러리를 도입하면 번들 크기 + 보안 면 부담이 커지므로 작은 inline 파서로 대신한다.

import { Fragment, type ReactNode } from 'react';

// `**…**` 패턴만 분해하는 토크나이저. 닫는 `**` 없이 끝나는 토큰은 일반 텍스트로 흘려보낸다.
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;

// 단일 문자열을 토큰화해 <strong> / plain 노드 배열로 반환한다.
function tokenizeBold(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  BOLD_PATTERN.lastIndex = 0;
  while ((match = BOLD_PATTERN.exec(line)) !== null) {
    if (match.index > cursor) {
      nodes.push(line.slice(cursor, match.index));
    }
    nodes.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
    cursor = match.index + match[0].length;
  }
  if (cursor < line.length) {
    nodes.push(line.slice(cursor));
  }
  return nodes;
}

// 텍스트 전체를 받아 줄 단위로 <Fragment> 로 묶고 줄 사이는 <br /> 로 잇는다.
// 빈 텍스트는 호출 측에서 노출 자체를 생략하는 게 자연스럽지만, 안전망으로 null 반환을 지원한다.
export function renderInlineMarkdown(text: string | null | undefined): ReactNode {
  if (text == null) return null;
  const trimmed = text;
  if (trimmed.length === 0) return null;
  const lines = trimmed.split('\n');
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {tokenizeBold(line)}
          {index < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </>
  );
}
