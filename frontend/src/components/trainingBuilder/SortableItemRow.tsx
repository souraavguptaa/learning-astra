import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ContentItem } from "../../features/content.js";
import type { AssessmentSummary, TrainingItem } from "../../features/training.js";

export function SortableItemRow({
  item,
  content,
  assessment,
  onRemove,
}: {
  item: TrainingItem;
  content: ContentItem | null;
  assessment?: AssessmentSummary | null;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const label = item.itemType === "assessment" ? "QUIZ" : (content?.type ?? "?").toUpperCase();
  const title = item.itemType === "assessment" ? (assessment?.title ?? "(missing assessment)") : (content?.title ?? "(missing content)");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-slate-200 rounded px-3 py-2"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-slate-400">
        ⠿
      </span>
      <span className="text-xs uppercase text-slate-500 w-14">{label}</span>
      <span className="flex-1 text-sm">{title}</span>
      <button onClick={onRemove} className="text-red-500 text-xs hover:underline">
        Remove
      </button>
    </div>
  );
}
