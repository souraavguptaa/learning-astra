import { useState } from "react";
import { useCreateAssessment, type AssessmentQuestionInput } from "../../features/assessment.js";

function emptyQuestion(): AssessmentQuestionInput {
  return {
    questionText: "",
    type: "mcq",
    options: [
      { optionText: "", isCorrect: true },
      { optionText: "", isCorrect: false },
    ],
  };
}

export function AssessmentBuilderForm({ trainingId, onDone }: { trainingId: string; onDone: () => void }) {
  const createAssessment = useCreateAssessment(trainingId);
  const [title, setTitle] = useState("");
  const [passPercentage, setPassPercentage] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [questions, setQuestions] = useState<AssessmentQuestionInput[]>([emptyQuestion()]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const q = questions[current];

  function updateQuestion(patch: Partial<AssessmentQuestionInput>) {
    setQuestions((qs) => qs.map((x, i) => (i === current ? { ...x, ...patch } : x)));
  }

  function updateOption(oIndex: number, patch: { optionText?: string; isCorrect?: boolean }) {
    setQuestions((qs) =>
      qs.map((x, i) => {
        if (i !== current) return x;
        const options = x.options.map((o, j) => {
          if (patch.isCorrect !== undefined) {
            // single-correct-answer semantics: selecting one clears the others
            return { ...o, isCorrect: j === oIndex ? patch.isCorrect! : false };
          }
          return j === oIndex ? { ...o, ...patch } : o;
        });
        return { ...x, options };
      }),
    );
  }

  function setQuestionType(type: "mcq" | "true_false") {
    updateQuestion({
      type,
      options:
        type === "true_false"
          ? [
              { optionText: "True", isCorrect: true },
              { optionText: "False", isCorrect: false },
            ]
          : [
              { optionText: "", isCorrect: true },
              { optionText: "", isCorrect: false },
            ],
    });
  }

  function addOption() {
    setQuestions((qs) => qs.map((x, i) => (i === current ? { ...x, options: [...x.options, { optionText: "", isCorrect: false }] } : x)));
  }

  function removeQuestion() {
    if (questions.length === 1) return;
    setQuestions((qs) => qs.filter((_, i) => i !== current));
    setCurrent((c) => Math.max(0, c - 1));
  }

  function validateCurrent(): boolean {
    if (!q.questionText.trim()) {
      setError("Question text is required.");
      return false;
    }
    if (q.type === "mcq" && q.options.some((o) => !o.optionText.trim())) {
      setError("Every option needs text.");
      return false;
    }
    setError(null);
    return true;
  }

  function goNext() {
    if (!validateCurrent()) return;
    if (current === questions.length - 1) {
      setQuestions((qs) => [...qs, emptyQuestion()]);
    }
    setCurrent((c) => c + 1);
  }

  function goBack() {
    setError(null);
    setCurrent((c) => Math.max(0, c - 1));
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Assessment title is required.");
      return;
    }
    if (!validateCurrent()) return;
    await createAssessment.mutateAsync({ title, passPercentage, maxAttempts, questions });
    onDone();
  }

  return (
    <div className="space-y-4 bg-slate-50 rounded p-4 border border-slate-200">
      <div>
        <label className="text-xs text-slate-500">Assessment title</label>
        <div className="flex gap-2 mt-0.5">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <label
            className="text-xs text-slate-500 flex items-center gap-1"
            title="The minimum score a learner needs to pass this quiz"
          >
            Pass %
            <input
              type="number"
              min={1}
              max={100}
              value={passPercentage}
              onChange={(e) => setPassPercentage(Number(e.target.value))}
              className="w-16 rounded-md border border-slate-300 px-2 py-1"
            />
          </label>
          <label
            className="text-xs text-slate-500 flex items-center gap-1"
            title="How many times a learner can retake this quiz before they're locked out"
          >
            Max attempts
            <input
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-16 rounded-md border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Question {current + 1} of {questions.length}
          </span>
          {questions.length > 1 && (
            <button type="button" onClick={removeQuestion} className="text-red-500">
              Remove this question
            </button>
          )}
        </div>
        <label className="text-xs text-slate-500">Question text</label>
        <div className="flex gap-2 items-center">
          <input
            required
            value={q.questionText}
            onChange={(e) => updateQuestion({ questionText: e.target.value })}
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <select
            value={q.type}
            onChange={(e) => setQuestionType(e.target.value as "mcq" | "true_false")}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="mcq">MCQ</option>
            <option value="true_false">True/False</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 pl-2">Pick the circle next to the correct answer.</p>
        <div className="space-y-1 pl-2">
          {q.options.map((o, oIndex) => (
            <div key={oIndex} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${current}`}
                checked={o.isCorrect}
                onChange={() => updateOption(oIndex, { isCorrect: true })}
              />
              <span className="text-xs text-slate-400 w-14 shrink-0">Option {oIndex + 1}</span>
              <input
                required
                disabled={q.type === "true_false"}
                value={o.optionText}
                onChange={(e) => updateOption(oIndex, { optionText: e.target.value })}
                className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
              />
            </div>
          ))}
          {q.type === "mcq" && (
            <button type="button" onClick={addOption} className="text-astra text-xs">
              + add option
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          disabled={current === 0}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Back
        </button>
        <button type="button" onClick={goNext} className="rounded-md border border-astra text-astra px-3 py-1.5 text-sm">
          Next question →
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSave}
          disabled={createAssessment.isPending}
          className="rounded-md bg-astra text-white px-4 py-1.5 text-sm font-medium disabled:opacity-60"
        >
          {createAssessment.isPending ? "Saving…" : "Save assessment"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-slate-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
