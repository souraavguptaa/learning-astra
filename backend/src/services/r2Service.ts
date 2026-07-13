import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
  },
});

export function buildFileKey(folder: string, originalFilename: string): string {
  const ext = originalFilename.includes(".") ? originalFilename.split(".").pop() : undefined;
  const base = randomUUID();
  return ext ? `${folder}/${base}.${ext}` : `${folder}/${base}`;
}

export async function getUploadUrl(key: string, contentType: string, expiresInSeconds = 900): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

export async function getDownloadUrl(key: string, expiresInSeconds = 600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: env.r2BucketName, Key: key });
  const response = await r2Client.send(command);
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function putObjectBuffer(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({ Bucket: env.r2BucketName, Key: key, Body: body, ContentType: contentType }),
  );
}
