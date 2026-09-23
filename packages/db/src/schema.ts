import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  jlptLevel: text("jlpt_level").notNull().default("N5"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New conversation"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    promptVersion: text("prompt_version"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);
export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceTitle: text("source_title").notNull(),
    section: text("section").notNull(),
    provenance: text("provenance").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }),
    metadata: jsonb("metadata"),
  },
  (t) => [
    index("source_chunks_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);
export const lessonCards = pgTable("lesson_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  kanji: text("kanji").notNull(),
  kana: text("kana").notNull(),
  meaning: text("meaning").notNull(),
  example: text("example"),
  partOfSpeech: text("part_of_speech"),
  pitch: text("pitch"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  stability: real("stability").notNull().default(0),
  difficulty: real("difficulty").notNull().default(5),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
  scheduledDays: real("scheduled_days").notNull().default(0),
  fsrsState: text("fsrs_state").notNull().default("New"),
  schedulerVersion: text("scheduler_version").notNull().default("fsrs-5"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const reviewEvents = pgTable(
  "review_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => lessonCards.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    dueAtAfter: timestamp("due_at_after", { withTimezone: true }).notNull(),
    stabilityAfter: real("stability_after").notNull(),
    difficultyAfter: real("difficulty_after").notNull(),
    schedulerVersion: text("scheduler_version").notNull(),
  },
  (t) => [index("reviews_card_time_idx").on(t.cardId, t.reviewedAt)],
);
export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sourceConversationId: uuid("source_conversation_id").references(
    () => conversations.id,
    { onDelete: "set null" },
  ),
  questions: jsonb("questions").notNull(),
  score: real("score"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const authUser = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const authSession = pgTable("auth_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
});
export const authAccount = pgTable("auth_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const authVerification = pgTable("auth_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
