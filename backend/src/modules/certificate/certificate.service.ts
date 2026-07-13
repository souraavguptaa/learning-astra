import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { certificates, trainings, users } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { getDownloadUrl, putObjectBuffer } from "../../services/r2Service.js";

function buildCertificateNumber(): string {
  const year = new Date().getFullYear();
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `LA-${year}-${suffix}`;
}

async function renderCertificatePdf(input: {
  userName: string;
  trainingTitle: string;
  scorePercentage: number;
  certificateNumber: string;
  issuedAt: Date;
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const astraBlue = rgb(0.145, 0.388, 0.922);

  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: astraBlue, borderWidth: 3 });

  page.drawText("Learning Astra", { x: 40, y: height - 60, size: 16, font, color: astraBlue });
  page.drawText("SastaSundar Learning Dashboard", { x: 40, y: height - 80, size: 10, font: regularFont, color: rgb(0.4, 0.4, 0.4) });

  // ponytail: no SastaSundar logo image on hand — text wordmark badge; swap for doc.embedPng(logoBytes) once a file is supplied.
  const sastaSundarGreen = rgb(0.02, 0.55, 0.28);
  const wordmark = "SastaSundar";
  const wordmarkWidth = font.widthOfTextAtSize(wordmark, 16);
  page.drawRectangle({ x: width - 60 - wordmarkWidth - 16, y: height - 70, width: wordmarkWidth + 32, height: 26, color: sastaSundarGreen });
  page.drawText(wordmark, { x: width - 60 - wordmarkWidth, y: height - 63, size: 16, font, color: rgb(1, 1, 1) });

  page.drawText("Certificate of Completion", {
    x: width / 2 - font.widthOfTextAtSize("Certificate of Completion", 28) / 2,
    y: height - 180,
    size: 28,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText("This certifies that", {
    x: width / 2 - regularFont.widthOfTextAtSize("This certifies that", 12) / 2,
    y: height - 230,
    size: 12,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(input.userName, {
    x: width / 2 - font.widthOfTextAtSize(input.userName, 22) / 2,
    y: height - 265,
    size: 22,
    font,
    color: astraBlue,
  });

  const completionLine = `has successfully completed "${input.trainingTitle}" with a score of ${input.scorePercentage}%`;
  page.drawText(completionLine, {
    x: width / 2 - regularFont.widthOfTextAtSize(completionLine, 13) / 2,
    y: height - 300,
    size: 13,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Date: ${input.issuedAt.toLocaleDateString("en-IN")}`, { x: 60, y: 70, size: 10, font: regularFont });
  page.drawText(`Certificate ID: ${input.certificateNumber}`, { x: 60, y: 55, size: 10, font: regularFont });
  page.drawText("Created by Sourav Gupta", {
    x: width - 60 - regularFont.widthOfTextAtSize("Created by Sourav Gupta", 10),
    y: 55,
    size: 10,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function generateCertificate(
  userId: string,
  trainingId: string,
  assessmentId: string,
  scorePercentage: number,
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [training] = await db.select().from(trainings).where(eq(trainings.id, trainingId)).limit(1);
  if (!user || !training) throw new ApiError(404, "User or training not found for certificate generation");

  const certificateNumber = buildCertificateNumber();
  const issuedAt = new Date();

  const pdfBuffer = await renderCertificatePdf({
    userName: user.name,
    trainingTitle: training.title,
    scorePercentage,
    certificateNumber,
    issuedAt,
  });

  const pdfFileKey = `certificates/${certificateNumber}.pdf`;
  await putObjectBuffer(pdfFileKey, pdfBuffer, "application/pdf");

  const [certificate] = await db
    .insert(certificates)
    .values({
      certificateNumber,
      userId,
      trainingId,
      assessmentId,
      scorePercentage: scorePercentage.toString(),
      pdfFileKey,
      issuedAt,
    })
    .returning();

  return certificate;
}

export async function listMyCertificates(userId: string) {
  return db.select().from(certificates).where(eq(certificates.userId, userId));
}

export async function getCertificateDownloadUrl(certificateId: string, userId: string) {
  const [certificate] = await db.select().from(certificates).where(eq(certificates.id, certificateId)).limit(1);
  if (!certificate) throw new ApiError(404, "Certificate not found");
  if (certificate.userId !== userId) throw new ApiError(403, "This certificate does not belong to you");
  const url = await getDownloadUrl(certificate.pdfFileKey);
  return { url };
}
