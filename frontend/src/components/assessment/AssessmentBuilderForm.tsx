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

  function updateQuestion(index: number, patch: Partial<AssessmentQuestionInput>) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, patch: { optionText?: string; isCorrect?: boolean }) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.map((o, j) => {
          if (patch.isCorrect !== undefined) {
            // single-correct-answer semantics: selecting one clears the others
            return { ...o, isCorrect: j === oIndex ? patch.isCorrect! : false };
          }
          return j === oIndex ? { ...o, ...patch } : o;
        });
        return { ...q, options };
      }),
    );
  }

  function setQuestionType(qIndex: number, type: "mcq" | "true_false") {
    updateQuestion(qIndex, {
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

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  function addOption(qIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, { optionText: "", isCorrect: false }] } : q)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createAssessment.mutateAsync({ title, passPercentage, maxAttempts, questions });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 rounded p-4 border border-slate-200">
      <div className="flex gap-2">
        <input
          placeholder="Assessment title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <label className="text-xs text-slate-500 flex items-center gap-1">
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
        <label className="text-xs text-slate-500 flex items-center gap-1">
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

      {questions.map((q, qIndex) => (
        <div key={qIndex} className="bg-white rounded border border-slate-200 p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input
              placeholder={`Question ${qIndex + 1}`}
              required
              value={q.questionText}
              onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <select
              value={q.type}
              onChange={(e) => setQuestionType(qIndex, e.target.value as "mcq" | "true_false")}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="mcq">MCQ</option>
              <option value="true_false">True/False</option>
            </select>
            {questions.length > 1 && (
              <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 text-xs">
                Remove
              </button>
            )}
          </div>
          <div className="space-y-1 pl-2">
            {q.options.map((o, oIndex) => (
              <div key={oIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qIndex}`}
                  checked={o.isCorrect}
                  onChange={() => updateOption(qIndex, oIndex, { isCorrect: true })}
                />
                <input
                  placeholder={`Option ${oIndex + 1}`}
                  required
                  disabled={q.type === "true_false"}
                  value={o.optionText}
                  onChange={(e) => updateOption(qIndex, oIndex, { optionText: e.target.value })}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                />
              </div>
            ))}
            {q.type === "mcq" && (
              <button type="button" onClick={() => addOption(qIndex)} className="text-astra text-xs">
                + add option
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <button type="button" onClick={addQuestion} className="text-astra text-sm underline">
          + Add question
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createAssessment.isPending}
          className="rounded-md bg-astra text-white px-4 py-1.5 text-sm font-medium"
        >
          Save assessment
        </button>
        <button type="button" onClick={onDone} className="text-sm text-slate-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
