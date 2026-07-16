import { useState } from "react";
import { useNpsStatus, useSubmitNps } from "../../features/nps.js";

export function NpsPrompt({ trainingId }: { trainingId: string }) {
  const { data: status } = useNpsStatus(trainingId);
  const submit = useSubmitNps(trainingId);
  const [selected, setSelected] = useState<number | null>(null);

  if (!status || status.submitted) return null;

  return (
    <div className="bg-white rounded-lg shadow-clay p-4 mt-4">
      <h3 className="font-semibold text-slate-700 mb-2">How likely are you to recommend this training?</h3>
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            onClick={() => setSelected(n)}
            className={`w-8 h-8 rounded text-sm border ${
              selected === n ? "bg-astra text-white border-astra" : "border-slate-300 text-slate-600"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        disabled={selected === null || submit.isPending}
        onClick={() => selected !== null && submit.mutate(selected)}
        className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm disabled:opacity-50"
      >
        Submit feedback
      </button>
    </div>
  );
}
