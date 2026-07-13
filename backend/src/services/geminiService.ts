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

// ponytail: returns null on missing key or API failure rather than throwing — callers degrade to
// "AI Support isn't set up" / skip-embedding rather than breaking content/announcement/ad creation.
// taskType matters a lot here: embedding a query and a document with mismatched (or default/unspecified)
// task types tanks retrieval similarity scores even for genuinely related pairs.
export async function embedText(text: string, taskType: "document" | "query" = "document"): Promise<number[] | null> {
  const genAI = client();
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text }] },
      taskType: taskType === "query" ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT,
    });
    return result.embedding.values;
  } catch (err) {
    console.error("Gemini embed failed:", err);
    return null;
  }
}

export const NO_ANSWER_SENTINEL = "NO_ANSWER_FOUND";

// ponytail: sentinel token instead of matching English "I don't know" phrases — the app is
// explicitly multilingual, so a fuzzy string match on the answer text would silently break
// for every non-English reply. The model reliably emits the exact token when asked to.
export async function generateGroundedAnswer(query: string, context: string): Promise<string | null> {
  const genAI = client();
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: CHAT_MODEL });
    const prompt = `You are a support assistant for SastaSundar pharmacy franchise partners and staff, inside the Learning Astra training app.
Answer the user's question using ONLY the information in the CONTEXT below — never invent facts, steps, or policies that aren't there.
Reply in the same language the question was asked in. Keep the answer short and directly actionable.
If the context doesn't actually contain a real answer to the question (e.g. it's just a title with no
real instructions), respond with EXACTLY this and nothing else: ${NO_ANSWER_SENTINEL}

CONTEXT:
${context}

QUESTION: ${query}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini generate failed:", err);
    return null;
  }
}
