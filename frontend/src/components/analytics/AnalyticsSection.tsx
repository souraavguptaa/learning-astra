import { SegmentBreakdown } from "./SegmentBreakdown.js";
import { TrainerPerformanceTable } from "./TrainerPerformanceTable.js";
import { TrainingPerformanceTable } from "./TrainingPerformanceTable.js";
import { TrendChart } from "./TrendChart.js";

/** Shared by Super Admin and Admin dashboards — analytics visibility is read-only and Admin
 * already has write access to users/content/trainings, so there's no reason to hold this back. */
export function AnalyticsSection() {
  return (
    <div className="space-y-4">
      <TrendChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SegmentBreakdown />
        <TrainerPerformanceTable />
      </div>
      <TrainingPerformanceTable />
    </div>
  );
}
