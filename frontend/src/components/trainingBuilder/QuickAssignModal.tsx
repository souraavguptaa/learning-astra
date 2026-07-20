import { X } from "lucide-react";
import { AssignmentPanel } from "./AssignmentPanel.js";

/** Opened straight from the Trainings/Assessments list — reassigning something that already exists
 * doesn't require opening the builder at all. */
export function QuickAssignModal({ trainingId, title, onClose }: { trainingId: string; title: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="modal-panel bg-white rounded-lg max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Assign "{title}"</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <AssignmentPanel trainingId={trainingId} />
      </div>
    </div>
  );
}
