import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { ads, announcements, contentEmbeddings, contentItems, aiSearchQueries } from "../../db/schema/index.js";
import { embedText, generateGroundedAnswer } from "../../services/geminiService.js";

const SIMILARITY_THRESHOLD = 0.72; // cosine similarity (1 - distance); ponytail: tune once real queries come in

type SourceType = "content" | "announcement" | "ad";

export async function upsertEmbedding(sourceType: SourceType, sourceId: string, text: string) {
  const embedding = await embedText(text);
  if (!embedding) return; // no key configured yet — reembedAll() backfills once one is added
  await db
    .insert(contentEmbeddings)
    .values({ sourceType, sourceId, sourceText: text, embedding })
    .onConflictDoUpdate({
      target: [contentEmbeddings.sourceType, contentEmbeddings.sourceId],
      set: { sourceText: text, embedding, updatedAt: new Date() },
    });
}

export async function reembedAll() {
  const items = await db.select().from(contentItems).where(eq(contentItems.status, "ready"));
  for (const c of items) {
    await upsertEmbedding("content", c.id, `${c.title}. ${c.description}. Topic: ${c.topic}. Language: ${c.language}`);
  }
  const anns = await db.select().from(announcements);
  for (const a of anns) {
    await upsertEmbedding("announcement", a.id, `${a.title}. ${a.body}`);
  }
  const adRows = await db.select().from(ads).where(eq(ads.isActive, true));
  for (const ad of adRows) {
    await upsertEmbedding("ad", ad.id, ad.title);
  }
  return { contentCount: items.length, announcementCount: anns.length, adCount: adRows.length };
}

async function resolveSource(sourceType: string, sourceId: string) {
  if (sourceType === "content") {
    const [c] = await db.select().from(contentItems).where(eq(contentItems.id, sourceId)).limit(1);
    return c ? { type: "content" as const, id: c.id, title: c.title, deepLink: "/content" } : null;
  }
  if (sourceType === "announcement") {
    const [a] = await db.select().from(announcements).where(eq(announcements.id, sourceId)).limit(1);
    return a ? { type: "announcement" as const, id: a.id, title: a.title, deepLink: "/announcements" } : null;
  }
  const [ad] = await db.select().from(ads).where(eq(ads.id, sourceId)).limit(1);
  return ad ? { type: "ad" as const, id: ad.id, title: ad.title, deepLink: ad.linkUrl } : null;
}

const NOT_CONFIGURED_MESSAGE = "AI Support isn't set up yet. Please raise a support ticket and a trainer will help you.";
const NO_MATCH_MESSAGE = "I couldn't find verified content for that. Please raise a support ticket and a trainer will help you.";

export async function ask(userId: string, query: string) {
  const queryEmbedding = await embedText(query);
  if (!queryEmbedding) {
    return { confident: false, answer: null, message: NOT_CONFIGURED_MESSAGE, matches: [] };
  }

  const vecParam = JSON.stringify(queryEmbedding);
  const result = await db.execute(sql`
    SELECT source_type, source_id, source_text, 1 - (embedding <=> ${vecParam}::vector) AS similarity
    FROM content_embeddings
    ORDER BY embedding <=> ${vecParam}::vector
    LIMIT 5
  `);
  const rows = result.rows as unknown as { source_type: SourceType; source_id: string; source_text: string; similarity: number }[];
  const top = rows[0];

  if (!top || Number(top.similarity) < SIMILARITY_THRESHOLD) {
    await db.insert(aiSearchQueries).values({ userId, queryText: query, hadConfidentMatch: false });
    return { confident: false, answer: null, message: NO_MATCH_MESSAGE, matches: [] };
  }

  const confidentRows = rows.filter((r) => Number(r.similarity) >= SIMILARITY_THRESHOLD);
  const context = confidentRows.map((r) => `- ${r.source_text}`).join("\n");
  const answer = await generateGroundedAnswer(query, context);

  const matches = (await Promise.all(confidentRows.map((r) => resolveSource(r.source_type, r.source_id)))).filter(
    (m): m is NonNullable<typeof m> => !!m,
  );

  await db.insert(aiSearchQueries).values({
    userId,
    queryText: query,
    matchedSourceType: top.source_type,
    matchedSourceId: top.source_id,
    similarityScore: top.similarity.toString(),
    answerText: answer,
    hadConfidentMatch: true,
  });

  return {
    confident: true,
    answer: answer ?? "Found relevant content but couldn't generate a summary — please check the linked source below.",
    message: null,
    matches,
  };
}
