// 스크립트 생성/수정 폼 + 스텝 에디터. 스텝은 배열 순서가 학습 순서다.
// RECORD 단계는 발음할 영어 문장(targetText)이 필수, INTRO 는 안내만 한다.

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi, type AdminStepInput, type Difficulty, type ScriptDetail } from '../../api';
import { notifyApiError } from '../../lib/notify';

type StepDraft = { kind: 'INTRO' | 'RECORD'; prompt: string; targetText: string };

const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

function toDrafts(steps: ScriptDetail['steps']): StepDraft[] {
  return steps.map((s) => ({ kind: s.kind, prompt: s.prompt, targetText: s.targetText ?? '' }));
}

export default function ScriptForm({
  trackId,
  initial,
  onCancel,
  onSaved,
}: {
  trackId: number;
  initial: ScriptDetail | null;
  onCancel: () => void;
  onSaved: (saved: ScriptDetail) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>(initial?.difficulty ?? '');
  const [practiceWord, setPracticeWord] = useState(initial?.practiceWord ?? '');
  const [masteryBadgeName, setMasteryBadgeName] = useState(initial?.masteryBadgeName ?? '');
  const [steps, setSteps] = useState<StepDraft[]>(
    initial ? toDrafts(initial.steps) : [{ kind: 'RECORD', prompt: '', targetText: '' }]
  );
  const [saving, setSaving] = useState(false);

  const updateStep = (index: number, patch: Partial<StepDraft>) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const addStep = () => setSteps((prev) => [...prev, { kind: 'RECORD', prompt: '', targetText: '' }]);
  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));

  const canSave = Boolean(
    title.trim() &&
      content.trim() &&
      steps.length > 0 &&
      steps.every((s) => s.prompt.trim() && (s.kind === 'INTRO' || s.targetText.trim()))
  );

  const handleSave = async () => {
    if (saving || !canSave) return;
    setSaving(true);
    const apiSteps: AdminStepInput[] = steps.map((s) => ({
      kind: s.kind,
      prompt: s.prompt.trim(),
      targetText: s.kind === 'RECORD' ? s.targetText.trim() : undefined,
    }));
    const base = {
      title: title.trim(),
      content: content.trim(),
      difficulty: difficulty || undefined,
      practiceWord: practiceWord.trim() || undefined,
      masteryBadgeName: masteryBadgeName.trim() || undefined,
      steps: apiSteps,
    };
    try {
      const saved = initial
        ? await adminApi.updateScript(initial.id, base)
        : await adminApi.createScript({ ...base, trackId });
      toast.success(initial ? '스크립트를 수정했습니다.' : '스크립트를 추가했습니다.');
      onSaved(saved);
    } catch (err) {
      notifyApiError(err, '스크립트 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{initial ? '스크립트 수정' : '스크립트 추가'}</h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="w-full h-10 px-3 border-2 border-gray-300 rounded-lg focus:border-brand-500"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="본문 (전체 지문)"
        className="w-full h-20 p-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 resize-none"
      />
      <div className="flex gap-2">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
          className="flex-1 h-10 px-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white"
        >
          <option value="">난이도 미지정</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input
          value={practiceWord}
          onChange={(e) => setPracticeWord(e.target.value)}
          placeholder="연습 단어 (선택)"
          className="flex-1 h-10 px-3 border-2 border-gray-300 rounded-lg focus:border-brand-500"
        />
      </div>
      <input
        value={masteryBadgeName}
        onChange={(e) => setMasteryBadgeName(e.target.value)}
        placeholder="완료 배지 이름 (선택)"
        className="w-full h-10 px-3 border-2 border-gray-300 rounded-lg focus:border-brand-500"
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">학습 단계</span>
          <button onClick={addStep} className="flex items-center gap-1 text-sm text-brand-600 font-medium">
            <Plus size={14} /> 단계 추가
          </button>
        </div>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="p-3 bg-brand-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={step.kind}
                  onChange={(e) => updateStep(index, { kind: e.target.value as 'INTRO' | 'RECORD' })}
                  className="h-9 px-2 border-2 border-gray-300 rounded-lg bg-white text-sm"
                >
                  <option value="INTRO">안내</option>
                  <option value="RECORD">녹음</option>
                </select>
                <span className="text-xs text-gray-500 flex-1">단계 {index + 1}</span>
                <button
                  onClick={() => removeStep(index)}
                  disabled={steps.length <= 1}
                  aria-label="단계 삭제"
                  className="p-1.5 hover:bg-red-50 rounded-full transition-colors disabled:opacity-30"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
              <input
                value={step.prompt}
                onChange={(e) => updateStep(index, { prompt: e.target.value })}
                placeholder="안내 문구"
                className="w-full h-9 px-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 text-sm bg-white"
              />
              {step.kind === 'RECORD' && (
                <input
                  value={step.targetText}
                  onChange={(e) => updateStep(index, { targetText: e.target.value })}
                  placeholder="발음할 영어 문장 (targetText)"
                  className="w-full h-9 px-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 text-sm bg-white"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="flex-1 h-11 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl disabled:opacity-50 transition-colors"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 h-11 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </section>
  );
}
