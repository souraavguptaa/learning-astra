import { CheckCircle2, PartyPopper, XCircle } from "lucide-react";
import { useState } from "react";
import { useAssessmentForUser, useSubmitAssessment, type AssessmentSubmitResult } from "../../features/assessment.js";
import { AnimatedCheck } from "../common/AnimatedCheck.js";
import { QuestionImage } from "./QuestionImage.js";

export function AssessmentRunner({ assessmentId, onPassed }: { assessmentId: string; onPassed: () => void }) {
  const { data, refetch } = useAssessmentForUser(assessmentId);
  const submit = useSubmitAssessment(assessmentId);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentSubmitResult | null>(null);

  if (!data) return <p className="text-slate-400 text-sm">Loading quiz…</p>;

  const { assessment, questions, result: existingResult } = data;
  const attemptsRemaining = assessment.maxAttempts - (existingResult?.attemptsUsed ?? 0);
  const alreadyPassed = existingResult?.passed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answers = questions.map((q) => ({ questionId: q.id, selectedOptionId: selections[q.id] }));
    if (answers.some((a) => !a.selectedOptionId)) return;
    const res = await submit.mutateAsync(answers);
    setResult(res);
    if (res.passed) onPassed();
    refetch();
  }

  if (alreadyPassed && !result) {
    return (
      <div className="text-center py-8">
        <p className="text-emerald-600 font-medium text-lg inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-5 h-5" /> You already passed this quiz
        </p>
        <p className="text-sm text-slate-500">Best score: {existingResult?.bestScorePercentage}%</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className={`text-center py-4 rounded ${result.passed ? "bg-emerald-50" : "bg-red-50"}`}>
          {result.passed && <AnimatedCheck size={48} className="mx-auto mb-1" />}
          <p className={`text-2xl font-bold ${result.passed ? "text-emerald-600" : "text-red-600"}`}>
            {result.scorePercentage}%
          </p>
          <p className="text-sm text-slate-600 inline-flex items-center gap-1.5">
            {result.passed ? (
              <>
                <PartyPopper className="w-4 h-4" /> Passed!
              </>
            ) : (
              `Not passed (need ${assessment.passPercentage}%)`
            )}
          </p>
          {result.certificate && <p className="text-xs text-emerald-700 mt-1">Certificate issued — check My Certificates.</p>}
        </div>
        <div className="space-y-2">
          {questions.map((q) => {
            const b = result.breakdown.find((x) => x.questionId === q.id);
            return (
              <div key={q.id} className={`p-2 rounded text-sm ${b?.isCorrect ? "bg-emerald-50" : "bg-red-50"}`}>
                <div className="font-medium">{q.questionText}</div>
                {q.imageFileKey && <QuestionImage fileKey={q.imageFileKey} className="max-h-40 rounded-md border border-slate-200 my-1.5" />}
                <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                  {b?.isCorrect ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                  )}
                  {b?.isCorrect ? "Correct" : "Incorrect"} — correct answer:{" "}
                  {q.options.find((o) => o.id === b?.correctOptionId)?.optionText}
                </div>
              </div>
            );
          })}
        </div>
        {!result.passed && attemptsRemaining - 1 > 0 && (
          <button
            onClick={() => {
              setResult(null);
              setSelections({});
            }}
            className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm"
          >
            Retry ({attemptsRemaining - 1} attempt{attemptsRemaining - 1 === 1 ? "" : "s"} left)
          </button>
        )}
        {!result.passed && attemptsRemaining - 1 <= 0 && (
          <p className="text-sm text-red-500">No attempts remaining.</p>
        )}
      </div>
    );
  }

  if (attemptsRemaining <= 0) {
    return <p className="text-sm text-red-500">No attempts remaining for this quiz.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-500">
        Pass mark: {assessment.passPercentage}% · Attempts remaining: {attemptsRemaining}
      </p>
      {questions.map((q, idx) => (
        <div key={q.id} className="bg-slate-50 rounded p-3">
          <div className="font-medium text-sm mb-2">
            {idx + 1}. {q.questionText}
          </div>
          {q.imageFileKey && <QuestionImage fileKey={q.imageFileKey} className="max-h-56 rounded-md border border-slate-200 mb-2" />}
          <div className="space-y-1">
            {q.options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={q.id}
                  checked={selections[q.id] === o.id}
                  onChange={() => setSelections((s) => ({ ...s, [q.id]: o.id }))}
                />
                {o.optionText}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="submit"
        disabled={submit.isPending || Object.keys(selections).length < questions.length}
        className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        Submit
      </button>
    </form>
  );
}
