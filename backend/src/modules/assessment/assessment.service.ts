import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { assessmentOptions, assessmentQuestions, assessmentResults, assessments, trainings } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { generateCertificate } from "../certificate/certificate.service.js";
import { awardPoints, checkAndAwardBadges } from "../gamification/gamification.service.js";
import { notify } from "../notification/notification.service.js";
import { upsertEmbedding } from "../support/support.service.js";
import { addAssessmentItemToTraining, advanceTrainingProgressForAssessment } from "../training/training.service.js";

interface QuestionInput {
  questionText: string;
  type: "mcq" | "true_false";
  options: { optionText: string; isCorrect: boolean }[];
  imageFileKey?: string | null;
}

export async function createAssessment(
  createdBy: string,
  input: {
    trainingId: string;
    title: string;
    linkedContentId?: string;
    passPercentage: number;
    maxAttempts: number;
    questions: QuestionInput[];
  },
) {
  const [assessment] = await db
    .insert(assessments)
    .values({
      trainingId: input.trainingId,
      title: input.title,
      linkedContentId: input.linkedContentId ?? null,
      passPercentage: input.passPercentage,
      maxAttempts: input.maxAttempts,
      createdBy,
    })
    .returning();

  for (let qIndex = 0; qIndex < input.questions.length; qIndex++) {
    const q = input.questions[qIndex];
    if (!q.options.some((o) => o.isCorrect)) {
      throw new ApiError(400, `Question "${q.questionText}" needs at least one correct option`);
    }
    const [question] = await db
      .insert(assessmentQuestions)
      .values({
        assessmentId: assessment.id,
        questionText: q.questionText,
        type: q.type,
        questionOrder: qIndex,
        imageFileKey: q.imageFileKey ?? null,
      })
      .returning();

    for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
      const o = q.options[oIndex];
      await db.insert(assessmentOptions).values({
        questionId: question.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        optionOrder: oIndex,
      });
    }
  }

  await addAssessmentItemToTraining(input.trainingId, assessment.id);

  const questionSummary = input.questions.map((q) => q.questionText).join(". ");
  upsertEmbedding("assessment", assessment.id, `${assessment.title}. ${questionSummary}`).catch((err) =>
    console.error("Failed to embed assessment:", err),
  );

  return assessment;
}

export async function getAssessmentForManagement(assessmentId: string) {
  const [assessment] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!assessment) throw new ApiError(404, "Assessment not found");

  const questions = await db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(assessmentQuestions.questionOrder));

  const questionsWithOptions = await Promise.all(
    questions.map(async (q) => ({
      ...q,
      options: await db
        .select()
        .from(assessmentOptions)
        .where(eq(assessmentOptions.questionId, q.id))
        .orderBy(asc(assessmentOptions.optionOrder)),
    })),
  );

  return { assessment, questions: questionsWithOptions };
}

export async function getAssessmentForUser(assessmentId: string, userId: string) {
  const { assessment, questions } = await getAssessmentForManagement(assessmentId);

  const [result] = await db
    .select()
    .from(assessmentResults)
    .where(and(eq(assessmentResults.userId, userId), eq(assessmentResults.assessmentId, assessmentId)))
    .limit(1);

  const sanitizedQuestions = questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    type: q.type,
    imageFileKey: q.imageFileKey,
    options: q.options.map((o) => ({ id: o.id, optionText: o.optionText })),
  }));

  return {
    assessment: { id: assessment.id, title: assessment.title, passPercentage: assessment.passPercentage, maxAttempts: assessment.maxAttempts },
    questions: sanitizedQuestions,
    result: result
      ? {
          attemptsUsed: result.attemptsUsed,
          bestScorePercentage: result.bestScorePercentage,
          passed: result.passed,
        }
      : null,
  };
}

export async function submitAttempt(
  userId: string,
  assessmentId: string,
  answers: { questionId: string; selectedOptionId: string }[],
) {
  const { assessment, questions } = await getAssessmentForManagement(assessmentId);

  const [existing] = await db
    .select()
    .from(assessmentResults)
    .where(and(eq(assessmentResults.userId, userId), eq(assessmentResults.assessmentId, assessmentId)))
    .limit(1);

  if (existing?.passed) {
    throw new ApiError(400, "You have already passed this assessment");
  }
  if (existing && existing.attemptsUsed >= assessment.maxAttempts) {
    throw new ApiError(403, "No attempts remaining for this assessment");
  }

  let correctCount = 0;
  const breakdown = questions.map((q) => {
    const correctOption = q.options.find((o) => o.isCorrect);
    const answer = answers.find((a) => a.questionId === q.id);
    const isCorrect = !!answer && answer.selectedOptionId === correctOption?.id;
    if (isCorrect) correctCount++;
    return {
      questionId: q.id,
      selectedOptionId: answer?.selectedOptionId ?? null,
      correctOptionId: correctOption?.id ?? null,
      isCorrect,
    };
  });

  const scorePercentage = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const passed = scorePercentage >= assessment.passPercentage;
  const wasNewlyPassed = passed && !existing?.passed;

  const attemptsUsed = (existing?.attemptsUsed ?? 0) + 1;
  const bestScore = Math.max(scorePercentage, Number(existing?.bestScorePercentage ?? 0));

  if (existing) {
    await db
      .update(assessmentResults)
      .set({
        attemptsUsed,
        bestScorePercentage: bestScore.toString(),
        passed: existing.passed || passed,
        lastAnswers: answers,
        lastAttemptedAt: new Date(),
        passedAt: wasNewlyPassed ? new Date() : existing.passedAt,
      })
      .where(eq(assessmentResults.id, existing.id));
  } else {
    await db.insert(assessmentResults).values({
      userId,
      assessmentId,
      attemptsUsed,
      bestScorePercentage: bestScore.toString(),
      passed,
      lastAnswers: answers,
      lastAttemptedAt: new Date(),
      passedAt: passed ? new Date() : null,
    });
  }

  let certificate = null;
  if (wasNewlyPassed) {
    await advanceTrainingProgressForAssessment(userId, assessmentId);

    // A "quiz" added mid-training (+ Add quiz in the builder) and a standalone "Assessment"
    // (created from the Assessments section) are the exact same assessments row shape — the only
    // signal distinguishing them is whether the parent training was created as a standalone
    // assessment. Certificates only make sense for the latter; a quiz is just a checkpoint between
    // training content and shouldn't mint one.
    const [parentTraining] = await db
      .select({ isStandaloneAssessment: trainings.isStandaloneAssessment })
      .from(trainings)
      .where(eq(trainings.id, assessment.trainingId))
      .limit(1);
    const isRealAssessment = parentTraining?.isStandaloneAssessment ?? false;

    if (isRealAssessment) {
      certificate = await generateCertificate(userId, assessment.trainingId, assessmentId, scorePercentage);
    }
    await awardPoints(userId, 30, "assessment_passed", "assessment", assessmentId);
    await checkAndAwardBadges(userId);
    await notify(
      userId,
      "assessment_passed",
      isRealAssessment ? "Assessment Passed" : "Quiz Passed",
      isRealAssessment
        ? `You passed "${assessment.title}" with a score of ${scorePercentage}%.`
        : `You passed the "${assessment.title}" quiz with a score of ${scorePercentage}%.`,
      isRealAssessment ? `/certificates` : `/learning/${assessment.trainingId}`,
    );
  }

  return {
    scorePercentage,
    passed,
    attemptsUsed,
    maxAttempts: assessment.maxAttempts,
    breakdown,
    certificate,
  };
}
