// 정답 음소 시퀀스와 모델이 인식한 음소 시퀀스를 두 줄로 보여주고, 틀린 자리를 색으로 표시한다.
// 그 위로 targetText 의 단어들도 wrongWords 와 매칭해 빨강 처리한다.
//
// 색 규칙
//   - 단어 줄: targetText 를 공백으로 쪼갠 토큰 중, 소문자/구두점 제거 후 wrongWords 에 들어 있으면 빨강.
//   - 정답 음소 줄: substitution / deletion 인 canonicalIndex = 빨강.
//   - 인식 음소 줄: substitution / insertion 으로 등장한 perceived 토큰 = 빨강 (중복 카운트 처리).

import type { PhonemeError } from '../api';

interface PhonemeAlignmentProps {
  targetText?: string | null;
  canonical: string[];
  perceived: string[];
  errors: PhonemeError[];
  wrongWords: string[];
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

  const wrongWordSet = new Set(wrongWords.map((w) => w.toLowerCase()));

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
      {targetText && (
        <p className="text-base font-bold leading-relaxed">
          {tokenizeText(targetText).map((part, i) =>
            part.kind === 'word' ? (
              <span
                key={i}
                className={
                  wrongWordSet.has(part.normalized)
                    ? 'text-red-600 underline decoration-red-400 decoration-2 underline-offset-2'
                    : 'text-gray-900'
                }
              >
                {part.text}
              </span>
            ) : (
              <span key={i} className="text-gray-500">{part.text}</span>
            )
          )}
        </p>
      )}
      <Row label="정답" tokens={canonical} highlight={(_, i) => wrongCanonicalIdx.has(i)} />
      <Row label="당신" tokens={perceived} highlight={(_, i) => perceivedColors[i]} />
    </div>
  );
}

// 공백·구두점 경계로 텍스트를 단어 / 비단어 토큰으로 쪼갠다.
// normalized 는 소문자 + 알파벳·축약 부호만 남긴 형태로 wrongWords 와 비교에 쓴다.
type TextPart = { kind: 'word' | 'gap'; text: string; normalized: string };

function tokenizeText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const regex = /([A-Za-z][A-Za-z']*)|([^A-Za-z]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      parts.push({ kind: 'word', text: match[1], normalized: match[1].toLowerCase() });
    } else if (match[2]) {
      parts.push({ kind: 'gap', text: match[2], normalized: '' });
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
