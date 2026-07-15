import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { env } from "../config/env.js";

const EMBEDDING_MODEL = "gemini-embedding-001"; // 3072-dim output
const CHAT_MODEL = "gemini-flash-latest"; // alias tracks Google's current default flash model, avoids re-pinning as versions get deprecated

function client(): GoogleGenerativeAI | null {
  if (!env.geminiApiKey) return null;
  return new GoogleGenerativeAI(env.geminiApiKey);
}

export function isConfigured(): boolean {
  return !!env.geminiApiKey;
}

const REQUEST_TIMEOUT_MS = 20_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 503 ("high demand") and raw network failures are explicitly called out by Google as transient —
// worth one short retry. Quota/other 4xx errors are not — retrying those just wastes the timeout budget.
function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 503 || status === 429) return true;
  return err instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT/i.test(err.message);
}

// ponytail: returns null on missing key or API failure rather than throwing — callers degrade to
// "AI Support isn't set up" / skip-embedding rather than breaking content/announcement/ad creation.
// taskType matters a lot here: embedding a query and a document with mismatched (or default/unspecified)
// task types tanks retrieval similarity scores even for genuinely related pairs.
export async function embedText(text: string, taskType: "document" | "query" = "document"): Promise<number[] | null> {
  const genAI = client();
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(
      {
        content: { role: "user", parts: [{ text }] },
        taskType: taskType === "query" ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT,
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    return result.embedding.values;
  } catch (err) {
    console.error("Gemini embed failed:", err);
    return null;
  }
}

export const NO_ANSWER_SENTINEL = "NO_ANSWER_FOUND";

export type AnswerResult = { status: "answered"; text: string } | { status: "no_answer" } | { status: "error" };

// ponytail: sentinel token instead of matching English "I don't know" phrases - the app is
// explicitly multilingual, so a fuzzy string match on the answer text would silently break
// for every non-English reply. The model reliably emits the exact token when asked to.
export async function generateGroundedAnswer(query: string, context: string): Promise<AnswerResult> {
  const genAI = client();
  if (!genAI) return { status: "error" };
  const model = genAI.getGenerativeModel({ model: CHAT_MODEL });
  // Retrieval already filtered this context to what's semantically relevant (similarity threshold) —
  // this prompt's job is to summarize what's there, not re-judge relevance. Being too strict about
  // "just a title" caused real, on-topic matches to come back as "no answer" during testing.
  const prompt = `You are a support assistant for SastaSundar pharmacy franchise partners and staff, inside the Learning Astra training app.
The CONTEXT below has already been confirmed relevant to the question by a search step — your job is to
summarize and answer using it, not to re-judge relevance. Never invent facts, steps, or policies that
aren't there, but DO synthesize a short helpful answer from whatever real information is present, even
if it's just a title and a one-line description (e.g. "X is a training that covers Y").
Reply in the same language the question was asked in. Keep the answer short and directly actionable.
Only respond with EXACTLY this and nothing else if the context is completely empty or blank: ${NO_ANSWER_SENTINEL}

CONTEXT:
${context}

QUESTION: ${query}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(prompt, { timeout: REQUEST_TIMEOUT_MS });
      const text = result.response.text().trim();
      return text === NO_ANSWER_SENTINEL ? { status: "no_answer" } : { status: "answered", text };
    } catch (err) {
      if (attempt === 0 && isRetryable(err)) {
        await sleep(800);
        continue;
      }
      console.error("Gemini generate failed:", err);
      return { status: "error" };
    }
  }
  return { status: "error" };
}
