import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { announcementRouter } from "./modules/announcement/announcement.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { assessmentRouter } from "./modules/assessment/assessment.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { certificateRouter } from "./modules/certificate/certificate.routes.js";
import { contentRouter } from "./modules/content/content.routes.js";
import { gamificationRouter } from "./modules/gamification/gamification.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { notificationRouter } from "./modules/notification/notification.routes.js";
import { orgRouter } from "./modules/org/org.routes.js";
import { progressRouter } from "./modules/progress/progress.routes.js";
import { kbSubmissionRouter, ticketRouter } from "./modules/ticket/ticket.routes.js";
import { trainingRouter } from "./modules/training/training.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/org", orgRouter);
  app.use("/api/content", contentRouter);
  app.use("/api/trainings", trainingRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/assessments", assessmentRouter);
  app.use("/api/certificates", certificateRouter);
  app.use("/api/tickets", ticketRouter);
  app.use("/api/kb-submissions", kbSubmissionRouter);
  app.use("/api/gamification", gamificationRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/announcements", announcementRouter);
  app.use("/api/analytics", analyticsRouter);

  app.use(errorHandler);

  return app;
}
