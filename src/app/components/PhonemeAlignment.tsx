// 정답 음소 시퀀스와 모델이 인식한 음소 시퀀스를 두 줄로 보여주고, 틀린 자리를 색으로 표시한다.
// 그 위로 targetText 의 단어들도 wrongWords 의 (word + index) 와 매칭해 빨강 처리한다.
//
// 색 규칙
//   - 단어 줄: targetText 의 영어 단어를 0-based 로 셀 때 그 인덱스가 wrongWords 의 index 와
//     일치하면 빨강. word 도 같이 비교해 LLM 이 인덱스를 헷갈렸을 때 잘못 색칠하지 않는다.
//   - 정답 음소 줄: substitution / deletion 인 canonicalIndex = 빨강.
//   - 당신 음소 줄: substitution / insertion 으로 등장한 perceived 토큰 = 빨강 (중복 카운트 처리).

import type { PhonemeError, WrongWord } from '../api';

interface PhonemeAlignmentProps {
  targetText?: string | null;
  canonical: string[];
  perceived: string[];
  errors: PhonemeError[];
  wrongWords: WrongWord[];
}

export default function PhonemeAlignment({
  targetText,
  canonical,
  perceived,
  errors,
  wrongWords,
}: PhonemeAlignmentProps) {
  if (canonical.length === 0 && perceived.length === 0 && (!targetText || targetText.trim() === '')) {
    return null;
  }

  const wrongCanonicalIdx = new Set<number>();
  const wrongPerceivedTokens = new Map<string, number>();
  for (const e of errors) {
    if (!e.op) continue;
    if (e.op === 'substitution' || e.op === 'deletion') {
      if (e.canonicalIndex !== null && e.canonicalIndex !== undefined) {
        wrongCanonicalIdx.add(e.canonicalIndex);
      }
    }
    if ((e.op === 'substitution' || e.op === 'insertion') && e.perceived) {
      wrongPerceivedTokens.set(e.perceived, (wrongPerceivedTokens.get(e.perceived) ?? 0) + 1);
    }
  }

  const remaining = new Map(wrongPerceivedTokens);
  const perceivedColors = perceived.map((token) => {
    const left = remaining.get(token) ?? 0;
    if (left > 0) {
      remaining.set(token, left - 1);
      return true;
    }
    return false;
  });

  // index → expected word. 같은 인덱스가 중복으로 와도 마지막 값이 이긴다.
  const wrongByIndex = new Map<number, string>();
  for (const w of wrongWords) {
    if (w && typeof w.index === 'number' && w.index >= 0) {
      wrongByIndex.set(w.index, (w.word ?? '').toLowerCase());
    }
  }

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
      {targetText && (
        <p className="text-base font-bold leading-relaxed">
          {tokenizeText(targetText).map((part, i) => {
            if (part.kind !== 'word') {
              return <span key={i} className="text-gray-500">{part.text}</span>;
            }
            const expected = wrongByIndex.get(part.wordIndex);
            // word 가 비어 있으면 인덱스만 일치해도 빨강. word 가 적혔으면 정확히 일치할 때만.
            const isWrong = expected !== undefined && (expected === '' || expected === part.normalized);
            return (
              <span
                key={i}
                className={
                  isWrong
                    ? 'text-red-600 underline decoration-red-400 decoration-2 underline-offset-2'
                    : 'text-gray-900'
                }
              >
                {part.text}
              </span>
            );
          })}
        </p>
      )}
      <Row label="정답" tokens={canonical} highlight={(_, i) => wrongCanonicalIdx.has(i)} />
      <Row label="당신" tokens={perceived} highlight={(_, i) => perceivedColors[i]} />
    </div>
  );
}

// 텍스트를 단어 / 비단어 토큰으로 쪼개고, 단어에는 0-based wordIndex 를 매긴다.
type TextPart =
  | { kind: 'word'; text: string; normalized: string; wordIndex: number }
  | { kind: 'gap'; text: string };

function tokenizeText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const regex = /([A-Za-z][A-Za-z']*)|([^A-Za-z]+)/g;
  let match: RegExpExecArray | null;
  let wordIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      parts.push({ kind: 'word', text: match[1], normalized: match[1].toLowerCase(), wordIndex });
      wordIndex += 1;
    } else if (match[2]) {
      parts.push({ kind: 'gap', text: match[2] });
    }
  }
  return parts;
}

interface RowProps {
  label: string;
  tokens: string[];
  highlight: (token: string, index: number) => boolean;
}

function Row({ label, tokens, highlight }: RowProps) {
  if (tokens.length === 0) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="w-10 text-xs text-gray-500">{label}</span>
        <span className="text-xs text-gray-400">(없음)</span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="w-10 text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="flex flex-wrap gap-1.5">
        {tokens.map((tok, i) => (
          <span
            key={`${label}-${i}-${tok}`}
            className={`text-sm font-mono px-1.5 py-0.5 rounded ${
              highlight(tok, i)
                ? 'bg-red-100 text-red-600 font-bold'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            {tok}
          </span>
        ))}
      </span>
    </div>
  );
}
