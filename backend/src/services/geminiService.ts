import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";

const EMBEDDING_MODEL = "text-embedding-004";
const CHAT_MODEL = "gemini-1.5-flash";

function client(): GoogleGenerativeAI | null {
  if (!env.geminiApiKey) return null;
  return new GoogleGenerativeAI(env.geminiApiKey);
}

export function isConfigured(): boolean {
  return !!env.geminiApiKey;
}

// ponytail: returns null on missing key or API failure rather than throwing — callers degrade to
// "AI Support isn't set up" / skip-embedding rather than breaking content/announcement/ad creation.
export async function embedText(text: string): Promise<number[] | null> {
  const genAI = client();
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.error("Gemini embed failed:", err);
    return null;
  }
}

export async function generateGroundedAnswer(query: string, context: string): Promise<string | null> {
  const genAI = client();
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: CHAT_MODEL });
    const prompt = `You are a support assistant for SastaSundar pharmacy franchise partners and staff, inside the Learning Astra training app.
Answer the user's question using ONLY the information in the CONTEXT below — never invent facts, steps, or policies that aren't there.
Reply in the same language the question was asked in. Keep the answer short and directly actionable.
If the context doesn't actually contain an answer to the question, say plainly that you don't have verified information on that.

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
