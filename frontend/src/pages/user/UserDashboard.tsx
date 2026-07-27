import { BookOpen, CheckCircle2, ClipboardCheck, Play, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMyGamification } from "../../features/gamification.js";
import { useAssignedTrainings } from "../../features/training.js";
import { useAuth } from "../../lib/authContext.js";

function DueBadge({ dueAt }: { dueAt: string | null }) {
  const { t } = useTranslation();
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const overdue = due.getTime() < Date.now();
  const soon = !overdue && due.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // within 3 days
  const cls = overdue ? "bg-red-50 text-red-700" : soon ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500";
  return (
    <span className={`rounded-pill px-2 py-0.5 text-[11px] font-medium shrink-0 ${cls}`}>
      {overdue ? t("dashboard.overdue") : t("dashboard.due")} {due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
    </span>
  );
}

function TrainingRow({
  title,
  isMandatory,
  dueAt,
  href,
  isAssessment,
  started,
  assignedByName,
}: {
  title: string;
  isMandatory: boolean;
  dueAt?: string | null;
  href: string;
  isAssessment: boolean;
  started: boolean;
  assignedByName?: string | null;
}) {
  const { t } = useTranslation();
  // Assessments always get the same clipboard icon/color regardless of progress — trainings use
  // Play once started, BookOpen before — so an assessment never reads as "just another training".
  const Icon = isAssessment ? ClipboardCheck : started ? Play : BookOpen;
  const iconClassName = isAssessment ? "bg-purple-50 text-purple-700" : started ? "bg-astra-soft text-astra-dark" : "bg-slate-100 text-slate-500";
  return (
    <Link to={href} className="hover-lift flex items-center justify-between gap-3 bg-white shadow-clay-sm rounded-lg p-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-md shrink-0 ${iconClassName}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="font-medium truncate">{title}</div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span
              className={`inline-block rounded-pill px-2 py-0.5 text-[11px] font-medium ${
                isMandatory ? "bg-astra-soft text-astra-dark" : "bg-slate-100 text-slate-500"
              }`}
            >
              {isMandatory ? t("dashboard.mandatory") : t("dashboard.optional")}
            </span>
            {assignedByName && <span className="text-[11px] text-slate-400">{t("dashboard.assignedBy", { name: assignedByName })}</span>}
          </div>
        </div>
      </div>
      {dueAt !== undefined && <DueBadge dueAt={dueAt} />}
    </Link>
  );
}

export function UserDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: assignedRaw, isLoading } = useAssignedTrainings();
  const { data: gamification } = useMyGamification();

  // Trainings with no content items yet are nothing a learner can act on — leave them off the
  // list instead of giving them a dead-end click.
  const assigned = assignedRaw?.filter((a) => a.hasItems);

  const inProgress = assigned?.filter((a) => a.progress && !a.progress.completed) ?? [];
  const notStarted = assigned?.filter((a) => !a.progress) ?? [];
  const completed = assigned?.filter((a) => a.progress?.completed) ?? [];

  const notStartedTrainings = notStarted.filter((a) => !a.training.isStandaloneAssessment);
  const notStartedAssessments = notStarted.filter((a) => a.training.isStandaloneAssessment);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">{t("dashboard.welcome", { name: user?.name })}</h1>

      {gamification && (
        <div className="bg-white rounded-xl shadow-clay overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-md bg-astra-soft text-astra-dark shrink-0">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <div className="text-2xl font-display font-semibold tabular-nums text-slate-800">{gamification.totalPoints}</div>
              <div className="text-xs text-slate-400">{t("dashboard.pointsEarned")}</div>
            </div>
          </div>
          {gamification.badges.length > 0 && (
            <>
              <div className="border-t border-black/[0.06] dark:border-white/10" />
              <div className="flex gap-2 flex-wrap px-5 py-3">
                {gamification.badges.map((b) => (
                  <span
                    key={b.id}
                    title={b.description}
                    className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-1 rounded-pill text-xs"
                  >
                    {b.icon} {b.name}
                  </span>
                ))}
              </div>
            </>
          )}
          {gamification.badges.length === 0 && (
            <div className="px-5 py-3 text-sm text-slate-400 border-t border-black/[0.06] dark:border-white/10">
              {t("dashboard.firstBadge")}
            </div>
          )}
        </div>
      )}

      {isLoading && <p className="text-slate-400">{t("dashboard.loadingTrainings")}</p>}

      {/* Continue Learning + Assigned are the two actionable lists — placed side by side on wide
          screens instead of stacked full-width, so both are visible without scrolling. Assigned
          items are further split by training vs. assessment so a new assessment never reads as
          "just another training" on the one screen learners actually check. */}
      {(inProgress.length > 0 || notStarted.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {inProgress.length > 0 && (
            <section>
              <h2 className="font-semibold text-slate-700 mb-2">{t("dashboard.continueLearning")}</h2>
              <div className="space-y-2">
                {inProgress.map(({ training, isMandatory, dueAt, assignedByName }) => (
                  <TrainingRow
                    key={training.id}
                    title={training.title}
                    isMandatory={isMandatory}
                    dueAt={dueAt}
                    href={`/learning/${training.id}`}
                    isAssessment={training.isStandaloneAssessment}
                    started
                    assignedByName={assignedByName}
                  />
                ))}
              </div>
            </section>
          )}
          <section className="space-y-4">
            {!isLoading && notStarted.length === 0 && (
              <div>
                <h2 className="font-semibold text-slate-700 mb-2">{t("dashboard.assignedTrainings")}</h2>
                <p className="text-slate-400 text-sm">{t("dashboard.nothingAssigned")}</p>
              </div>
            )}
            {notStartedTrainings.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-700 mb-2">{t("dashboard.assignedTrainings")}</h2>
                <div className="space-y-2">
                  {notStartedTrainings.map(({ training, isMandatory, dueAt, assignedByName }) => (
                    <TrainingRow
                      key={training.id}
                      title={training.title}
                      isMandatory={isMandatory}
                      dueAt={dueAt}
                      href={`/learning/${training.id}`}
                      isAssessment={false}
                      started={false}
                      assignedByName={assignedByName}
                    />
                  ))}
                </div>
              </div>
            )}
            {notStartedAssessments.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-700 mb-2">{t("dashboard.assignedAssessments")}</h2>
                <div className="space-y-2">
                  {notStartedAssessments.map(({ training, isMandatory, dueAt, assignedByName }) => (
                    <TrainingRow
                      key={training.id}
                      title={training.title}
                      isMandatory={isMandatory}
                      dueAt={dueAt}
                      href={`/learning/${training.id}`}
                      isAssessment
                      started={false}
                      assignedByName={assignedByName}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Completed trainings carry the least priority — a compact two-column grid instead of
          full-width rows keeps them lower visual weight than the actionable lists above. */}
      {completed.length > 0 && (
        <section>
          <h2 className="font-semibold text-slate-700 mb-2">{t("dashboard.completed")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {completed.map(({ training }) => (
              <Link
                key={training.id}
                to={`/learning/${training.id}`}
                className="hover-lift flex items-center gap-3 bg-white shadow-clay-sm rounded-lg px-4 py-2.5 opacity-70"
              >
                {training.isStandaloneAssessment ? (
                  <ClipboardCheck className="w-4 h-4 text-purple-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <div className="font-medium text-sm truncate">{training.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
