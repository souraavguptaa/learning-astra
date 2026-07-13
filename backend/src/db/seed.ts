import { eq } from "drizzle-orm";
import { assertDatabaseConfigured } from "../config/env.js";
import { hashPassword } from "../utils/password.js";
import { db } from "./client.js";
import { badges, companies, users } from "./schema/index.js";

const BADGE_DEFINITIONS = [
  {
    code: "first_training",
    name: "First Training Completed",
    description: "Completed your first training",
    icon: "🎯",
    criteriaType: "trainings_completed",
    criteriaValue: 1,
  },
  {
    code: "five_trainings",
    name: "5 Trainings Completed",
    description: "Completed 5 trainings",
    icon: "⭐",
    criteriaType: "trainings_completed",
    criteriaValue: 5,
  },
  {
    code: "ten_trainings",
    name: "10 Trainings Completed",
    description: "Completed 10 trainings",
    icon: "🏆",
    criteriaType: "trainings_completed",
    criteriaValue: 10,
  },
  {
    code: "perfect_score",
    name: "Perfect Score",
    description: "Scored 100% on an assessment",
    icon: "💯",
    criteriaType: "perfect_score",
    criteriaValue: 1,
  },
  {
    code: "first_certificate",
    name: "First Certificate",
    description: "Earned your first certificate",
    icon: "📜",
    criteriaType: "first_certificate",
    criteriaValue: 1,
  },
];

async function seedSuperAdmin() {
  const existing = await db.select().from(users).where(eq(users.role, "super_admin")).limit(1);
  if (existing.length > 0) {
    console.log(`Super Admin already exists: ${existing[0].email}`);
    return;
  }

  const [company] = await db.insert(companies).values({ name: "SastaSundar" }).returning();

  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@learningastra.local";
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!";

  const [superAdmin] = await db
    .insert(users)
    .values({ name: "Sourav Gupta", email, passwordHash: await hashPassword(password), role: "super_admin" })
    .returning();

  console.log(`Company: ${company.name} (${company.id})`);
  console.log(`Super Admin login: ${superAdmin.email} / ${password}`);
  console.log("Change this password after first login.");
}

async function seedBadges() {
  const existing = await db.select().from(badges);
  const existingCodes = new Set(existing.map((b) => b.code));
  const toInsert = BADGE_DEFINITIONS.filter((b) => !existingCodes.has(b.code));
  if (toInsert.length === 0) {
    console.log("Badges already seeded.");
    return;
  }
  await db.insert(badges).values(toInsert);
  console.log(`Seeded ${toInsert.length} badge(s).`);
}

async function main() {
  assertDatabaseConfigured();
  await seedSuperAdmin();
  await seedBadges();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});
