import { pgTable, text, uuid, timestamp, integer, jsonb, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Note: These schemas match the Supabase tables with Couples_ prefix
// The actual tables are created directly in Supabase via SQL

// 1. PROFILES TABLE
export const couplesProfiles = pgTable("Couples_profiles", {
  id: uuid("id").primaryKey(),
  full_name: text("full_name"),
  role: text("role").notNull(), // 'therapist' or 'client'
  couple_id: uuid("couple_id"),
});

export const insertProfileSchema = createInsertSchema(couplesProfiles).omit({ id: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof couplesProfiles.$inferSelect;

// 2. COUPLES TABLE
export const couplesCouples = pgTable("Couples_couples", {
  id: uuid("id").primaryKey(),
  partner1_id: uuid("partner1_id"),
  partner2_id: uuid("partner2_id"),
  therapist_id: uuid("therapist_id"),
});

export type Couple = typeof couplesCouples.$inferSelect;

// 3. LOVE LANGUAGES TABLE
export const couplesLoveLanguages = pgTable("Couples_love_languages", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  primary_language: text("primary_language"),
  secondary_language: text("secondary_language"),
  scores: jsonb("scores"), // { words_of_affirmation: 8, quality_time: 6, ... }
});

export const insertLoveLanguageSchema = createInsertSchema(couplesLoveLanguages).omit({ id: true }).extend({
  scores: z.record(z.number()),
});
export type InsertLoveLanguage = z.infer<typeof insertLoveLanguageSchema>;
export type LoveLanguage = typeof couplesLoveLanguages.$inferSelect;

// 4. GRATITUDE LOGS
export const couplesGratitudeLogs = pgTable("Couples_gratitude_logs", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  user_id: uuid("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  text_content: text("text_content"),
  image_url: text("image_url"),
});

export const insertGratitudeLogSchema = createInsertSchema(couplesGratitudeLogs).omit({
  id: true,
  created_at: true,
}).extend({
  text_content: z.string().nullable().optional(),
  image_url: z.string().min(1).nullable().optional(), // Storage path, not URL
}).refine(
  (data) => data.text_content || data.image_url,
  { message: "Either text content or image must be provided" }
);
export type InsertGratitudeLog = z.infer<typeof insertGratitudeLogSchema>;
export type GratitudeLog = typeof couplesGratitudeLogs.$inferSelect;

// 5. WEEKLY CHECK-INS
export const couplesWeeklyCheckins = pgTable("Couples_weekly_checkins", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  user_id: uuid("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  week_number: integer("week_number"),
  year: integer("year"),
  q_connectedness: integer("q_connectedness"), // 1-10
  q_conflict: integer("q_conflict"), // 1-10
  q_appreciation: text("q_appreciation"),
  q_regrettable_incident: text("q_regrettable_incident"),
  q_my_need: text("q_my_need"),
});

export const insertWeeklyCheckinSchema = createInsertSchema(couplesWeeklyCheckins).omit({
  id: true,
  created_at: true,
  week_number: true, // Auto-calculated by database trigger
  year: true, // Auto-calculated by database trigger
}).extend({
  q_connectedness: z.number().min(1).max(10),
  q_conflict: z.number().min(1).max(10),
  q_appreciation: z.string().min(1, "Please share what you appreciated"),
  q_regrettable_incident: z.string().min(1, "Please share the regrettable incident"),
  q_my_need: z.string().min(1, "Please share what you need"),
});
export type InsertWeeklyCheckin = z.infer<typeof insertWeeklyCheckinSchema>;
export type WeeklyCheckin = typeof couplesWeeklyCheckins.$inferSelect;

// 6. SHARED GOALS
export const couplesSharedGoals = pgTable("Couples_shared_goals", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_by: uuid("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  title: text("title").notNull(),
  status: text("status").default("backlog"), // 'backlog', 'doing', 'done'
  assigned_to: uuid("assigned_to"),
});

export const insertSharedGoalSchema = createInsertSchema(couplesSharedGoals).omit({
  id: true,
  created_at: true,
}).extend({
  title: z.string().min(1, "Goal title is required"),
});
export type InsertSharedGoal = z.infer<typeof insertSharedGoalSchema>;
export type SharedGoal = typeof couplesSharedGoals.$inferSelect;

// 7. THERAPIST COMMENTS
export const couplesTherapistComments = pgTable("Couples_therapist_comments", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  therapist_id: uuid("therapist_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  comment_text: text("comment_text").notNull(),
  is_private_note: boolean("is_private_note").default(false),
  related_activity_type: text("related_activity_type"),
  related_activity_id: uuid("related_activity_id"),
});

export const insertTherapistCommentSchema = createInsertSchema(couplesTherapistComments).omit({
  id: true,
  created_at: true,
}).extend({
  comment_text: z.string().min(1, "Comment is required"),
});
export type InsertTherapistComment = z.infer<typeof insertTherapistCommentSchema>;
export type TherapistComment = typeof couplesTherapistComments.$inferSelect;

// 8. CONVERSATIONS (Hold Me Tight)
export const couplesConversations = pgTable("Couples_conversations", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  initiator_id: uuid("initiator_id"),
  initiator_situation: text("initiator_situation"),
  initiator_statement_feel: text("initiator_statement_feel"),
  initiator_scared_of: text("initiator_scared_of"),
  initiator_embarrassed_about: text("initiator_embarrassed_about"),
  initiator_expectations: text("initiator_expectations"),
  initiator_statement_need: text("initiator_statement_need"),
  partner_reflection: text("partner_reflection"),
  partner_response: text("partner_response"),
});

export const insertConversationSchema = createInsertSchema(couplesConversations).omit({
  id: true,
  created_at: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof couplesConversations.$inferSelect;

// 9. RITUALS OF CONNECTION
export const couplesRituals = pgTable("Couples_rituals", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  category: text("category").notNull(), // 'Mornings', 'Reuniting', 'Mealtimes', 'Going to Sleep'
  description: text("description").notNull(),
  created_by: uuid("created_by"),
});

export const insertRitualSchema = createInsertSchema(couplesRituals).omit({ id: true }).extend({
  description: z.string().min(1, "Ritual description is required"),
});
export type InsertRitual = z.infer<typeof insertRitualSchema>;
export type Ritual = typeof couplesRituals.$inferSelect;

// 10. VOICE MEMOS
export const couplesVoiceMemos = pgTable("Couples_voice_memos", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  sender_id: uuid("sender_id").notNull(),
  recipient_id: uuid("recipient_id").notNull(),
  storage_path: text("storage_path"),
  duration_secs: numeric("duration_secs", { precision: 10, scale: 2 }),
  transcript_text: text("transcript_text"),
  is_listened: boolean("is_listened").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertVoiceMemoSchema = createInsertSchema(couplesVoiceMemos).omit({
  id: true,
  created_at: true,
}).extend({
  storage_path: z.string().min(1, "Storage path is required"),
  duration_secs: z.string().optional(),
  transcript_text: z.string().optional(),
});
export type InsertVoiceMemo = z.infer<typeof insertVoiceMemoSchema>;
export type VoiceMemo = typeof couplesVoiceMemos.$inferSelect;

// Love Language Quiz Types
export const LOVE_LANGUAGES = [
  "Words of Affirmation",
  "Quality Time",
  "Receiving Gifts",
  "Acts of Service",
  "Physical Touch",
] as const;

export type LoveLanguageType = typeof LOVE_LANGUAGES[number];

export interface QuizQuestion {
  id: number;
  optionA: { text: string; language: LoveLanguageType };
  optionB: { text: string; language: LoveLanguageType };
}

// Ritual Categories
export const RITUAL_CATEGORIES = [
  "Mornings",
  "Reuniting",
  "Mealtimes",
  "Going to Sleep",
] as const;

export type RitualCategory = typeof RITUAL_CATEGORIES[number];

// ANALYTICS TYPES
export interface CoupleAnalytics {
  couple_id: string;
  partner1_name: string;
  partner2_name: string;
  total_checkins: number;
  checkins_this_month: number;
  checkin_completion_rate: number; // percentage 0-100
  gratitude_count: number;
  goals_total: number;
  goals_completed: number;
  conversations_count: number;
  rituals_count: number;
  avg_connectedness: number; // 1-10
  avg_conflict: number; // 1-10
  last_activity_date: string | null;
  engagement_score: number; // 0-100 composite score
}

export interface TherapistAnalytics {
  therapist_id: string;
  total_couples: number;
  active_couples: number; // active in last 30 days
  overall_checkin_rate: number;
  total_gratitude_logs: number;
  total_comments_given: number;
  couples: CoupleAnalytics[];
}

export interface ActivityTimelinePoint {
  date: string; // ISO date
  checkins: number;
  gratitude_logs: number;
  goals_completed: number;
  conversations: number;
}

export interface WeeklyCompletionData {
  week_number: number;
  year: number;
  partner1_completed: boolean;
  partner2_completed: boolean;
  both_completed: boolean;
}

// AI INSIGHTS TYPE
export type AIInsight = {
  couple_id: string;
  generated_at: string; // ISO timestamp
  summary: string;
  discrepancies: string[];
  patterns: string[];
  recommendations: string[];
  raw_analysis: string; // Full Perplexity response
  citations?: string[]; // If Perplexity provides citations
};
