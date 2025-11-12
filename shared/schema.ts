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
  active_pause_id: uuid("active_pause_id"), // For Shared Pause Button feature
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

// 11. MESSAGES
export const couplesMessages = pgTable("Couples_messages", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  sender_id: uuid("sender_id").notNull(),
  message_text: text("message_text").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  is_read: boolean("is_read").default(false),
});

export const insertMessageSchema = createInsertSchema(couplesMessages).omit({
  id: true,
  created_at: true,
  is_read: true,
}).extend({
  message_text: z.string().min(1, "Message cannot be empty"),
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof couplesMessages.$inferSelect;

// 12. CALENDAR EVENTS
export const couplesCalendarEvents = pgTable("Couples_calendar_events", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_by: uuid("created_by").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  start_at: timestamp("start_at").notNull(),
  end_at: timestamp("end_at").notNull(),
  is_all_day: boolean("is_all_day").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(couplesCalendarEvents).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().min(1, "Event title is required"),
  start_at: z.date(),
  end_at: z.date(),
});
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof couplesCalendarEvents.$inferSelect;

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

// AI SESSION PREP TYPE
export type SessionPrepResult = {
  couple_id: string;
  generated_at: string;
  engagement_summary: string;
  concerning_patterns: string[];
  positive_patterns: string[];
  session_focus_areas: string[];
  recommended_interventions: string[];
  ai_analysis: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ==============================================
// LOVE MAP QUIZ TABLES (Gottman Methodology)
// ==============================================

// 13. LOVE MAP QUESTIONS
export const couplesLoveMapQuestions = pgTable("Couples_love_map_questions", {
  id: uuid("id").primaryKey(),
  question_text: text("question_text").notNull(),
  category: text("category"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export type LoveMapQuestion = typeof couplesLoveMapQuestions.$inferSelect;

// 14. LOVE MAP SESSIONS
export const couplesLoveMapSessions = pgTable("Couples_love_map_sessions", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
  partner1_truths_completed: boolean("partner1_truths_completed").default(false),
  partner2_truths_completed: boolean("partner2_truths_completed").default(false),
  partner1_guesses_completed: boolean("partner1_guesses_completed").default(false),
  partner2_guesses_completed: boolean("partner2_guesses_completed").default(false),
  partner1_score: numeric("partner1_score", { precision: 5, scale: 2 }),
  partner2_score: numeric("partner2_score", { precision: 5, scale: 2 }),
});

export const insertLoveMapSessionSchema = createInsertSchema(couplesLoveMapSessions).omit({
  id: true,
  created_at: true,
  completed_at: true,
  partner1_truths_completed: true,
  partner2_truths_completed: true,
  partner1_guesses_completed: true,
  partner2_guesses_completed: true,
  partner1_score: true,
  partner2_score: true,
});
export type InsertLoveMapSession = z.infer<typeof insertLoveMapSessionSchema>;
export type LoveMapSession = typeof couplesLoveMapSessions.$inferSelect;

// 15. LOVE MAP TRUTHS (Self-answers)
export const couplesLoveMapTruths = pgTable("Couples_love_map_truths", {
  id: uuid("id").primaryKey(),
  session_id: uuid("session_id").notNull(),
  question_id: uuid("question_id").notNull(),
  author_id: uuid("author_id").notNull(),
  answer_text: text("answer_text").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertLoveMapTruthSchema = createInsertSchema(couplesLoveMapTruths).omit({
  id: true,
  created_at: true,
}).extend({
  answer_text: z.string().min(1, "Answer is required"),
});
export type InsertLoveMapTruth = z.infer<typeof insertLoveMapTruthSchema>;
export type LoveMapTruth = typeof couplesLoveMapTruths.$inferSelect;

// 16. LOVE MAP GUESSES (Partner guesses)
export const couplesLoveMapGuesses = pgTable("Couples_love_map_guesses", {
  id: uuid("id").primaryKey(),
  session_id: uuid("session_id").notNull(),
  question_id: uuid("question_id").notNull(),
  guesser_id: uuid("guesser_id").notNull(),
  truth_id: uuid("truth_id").notNull(),
  guess_text: text("guess_text").notNull(),
  is_correct: boolean("is_correct"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertLoveMapGuessSchema = createInsertSchema(couplesLoveMapGuesses).omit({
  id: true,
  created_at: true,
  is_correct: true,
}).extend({
  guess_text: z.string().min(1, "Guess is required"),
});
export type InsertLoveMapGuess = z.infer<typeof insertLoveMapGuessSchema>;
export type LoveMapGuess = typeof couplesLoveMapGuesses.$inferSelect;

// ==============================================
// ECHO & EMPATHY FEATURE - Active Listening Communication Skill Builder
// ==============================================

// 17. ECHO SESSIONS
export const couplesEchoSessions = pgTable("Couples_echo_sessions", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  speaker_id: uuid("speaker_id").notNull(),
  listener_id: uuid("listener_id").notNull(),
  current_step: integer("current_step").notNull().default(1), // 1-3
  status: text("status").notNull().default("in_progress"), // 'in_progress', 'completed'
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

export const insertEchoSessionSchema = createInsertSchema(couplesEchoSessions).omit({
  id: true,
  created_at: true,
  completed_at: true,
}).extend({
  speaker_id: z.string().uuid(),
  listener_id: z.string().uuid(),
  current_step: z.number().min(1).max(3).default(1),
  status: z.enum(["in_progress", "completed"]).default("in_progress"),
});
export type InsertEchoSession = z.infer<typeof insertEchoSessionSchema>;
export type EchoSession = typeof couplesEchoSessions.$inferSelect;

// 18. ECHO TURNS
export const couplesEchoTurns = pgTable("Couples_echo_turns", {
  id: uuid("id").primaryKey(),
  session_id: uuid("session_id").notNull(),
  step: integer("step").notNull(), // 1-3
  author_id: uuid("author_id").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertEchoTurnSchema = createInsertSchema(couplesEchoTurns).omit({
  id: true,
  created_at: true,
}).extend({
  step: z.number().min(1).max(3),
  content: z.string().min(1, "Content is required"),
});
export type InsertEchoTurn = z.infer<typeof insertEchoTurnSchema>;
export type EchoTurn = typeof couplesEchoTurns.$inferSelect;

// ==============================================
// IFS INTRODUCTION FEATURE - Inner Family Systems Exercise
// ==============================================

// 19. IFS EXERCISES
export const couplesIfsExercises = pgTable("Couples_ifs_exercises", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  couple_id: uuid("couple_id").notNull(),
  status: text("status").notNull().default("in_progress"), // 'in_progress', 'completed'
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

export const insertIfsExerciseSchema = createInsertSchema(couplesIfsExercises).omit({
  id: true,
  created_at: true,
  completed_at: true,
}).extend({
  status: z.enum(["in_progress", "completed"]).default("in_progress"),
});
export type InsertIfsExercise = z.infer<typeof insertIfsExerciseSchema>;
export type IfsExercise = typeof couplesIfsExercises.$inferSelect;

// 20. IFS PARTS (Protective Parts)
export const couplesIfsParts = pgTable("Couples_ifs_parts", {
  id: uuid("id").primaryKey(),
  exercise_id: uuid("exercise_id").notNull(),
  user_id: uuid("user_id").notNull(),
  part_name: text("part_name").notNull(),
  when_appears: text("when_appears").notNull(),
  letter_content: text("letter_content").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertIfsPartSchema = createInsertSchema(couplesIfsParts).omit({
  id: true,
  created_at: true,
}).extend({
  part_name: z.string().min(1, "Part name is required"),
  when_appears: z.string().min(1, "Please describe when this part appears"),
  letter_content: z.string().min(1, "Letter content is required"),
});
export type InsertIfsPart = z.infer<typeof insertIfsPartSchema>;
export type IfsPart = typeof couplesIfsParts.$inferSelect;

// ==============================================
// SHARED PAUSE BUTTON FEATURE - Real-time De-escalation Tool
// ==============================================

// 21. PAUSE EVENTS
export const couplesPauseEvents = pgTable("Couples_pause_events", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  initiated_by: uuid("initiated_by").notNull(),
  started_at: timestamp("started_at").defaultNow(),
  ended_at: timestamp("ended_at"),
  duration_minutes: integer("duration_minutes"),
  reflection: text("reflection"),
});

export const insertPauseEventSchema = createInsertSchema(couplesPauseEvents).omit({
  id: true,
  started_at: true,
  ended_at: true,
  duration_minutes: true,
}).extend({
  reflection: z.string().optional(),
});
export type InsertPauseEvent = z.infer<typeof insertPauseEventSchema>;
export type PauseEvent = typeof couplesPauseEvents.$inferSelect;

// ==============================================
// INVITATION CODES - For Therapist-Couple Linking
// ==============================================

// 22. INVITATION CODES
export const couplesInvitationCodes = pgTable("Couples_invitation_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  therapist_id: uuid("therapist_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  expires_at: timestamp("expires_at"),
  used_at: timestamp("used_at"),
  used_by_couple_id: uuid("used_by_couple_id"),
  is_active: boolean("is_active").default(true),
});

export const insertInvitationCodeSchema = createInsertSchema(couplesInvitationCodes).omit({
  id: true,
  created_at: true,
  used_at: true,
  used_by_couple_id: true,
});
export type InsertInvitationCode = z.infer<typeof insertInvitationCodeSchema>;
export type InvitationCode = typeof couplesInvitationCodes.$inferSelect;

// ==============================================
// ATTACHMENT STYLE ASSESSMENT - Foundation for Relationship Patterns
// ==============================================

// 23. ATTACHMENT QUESTIONS
export const couplesAttachmentQuestions = pgTable("Couples_attachment_questions", {
  id: integer("id").primaryKey(),
  question_text: text("question_text").notNull(),
  attachment_category: text("attachment_category").notNull(), // 'secure', 'anxious', 'avoidant', 'disorganized'
  reverse_scored: boolean("reverse_scored").default(false),
});

export type AttachmentQuestion = typeof couplesAttachmentQuestions.$inferSelect;

// 24. ATTACHMENT SESSIONS
export const couplesAttachmentSessions = pgTable("Couples_attachment_sessions", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  user_id: uuid("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
  status: text("status").notNull().default("in_progress"), // 'in_progress', 'completed'
});

export const insertAttachmentSessionSchema = createInsertSchema(couplesAttachmentSessions).omit({
  id: true,
  created_at: true,
  completed_at: true,
});
export type InsertAttachmentSession = z.infer<typeof insertAttachmentSessionSchema>;
export type AttachmentSession = typeof couplesAttachmentSessions.$inferSelect;

// 25. ATTACHMENT RESPONSES
export const couplesAttachmentResponses = pgTable("Couples_attachment_responses", {
  id: uuid("id").primaryKey(),
  session_id: uuid("session_id").notNull(),
  question_id: integer("question_id").notNull(),
  response_value: integer("response_value").notNull(), // 1-5 Likert scale
  created_at: timestamp("created_at").defaultNow(),
});

export const insertAttachmentResponseSchema = createInsertSchema(couplesAttachmentResponses).omit({
  id: true,
  created_at: true,
}).extend({
  response_value: z.number().min(1).max(5),
});
export type InsertAttachmentResponse = z.infer<typeof insertAttachmentResponseSchema>;
export type AttachmentResponse = typeof couplesAttachmentResponses.$inferSelect;

// 26. ATTACHMENT RESULTS
export const couplesAttachmentResults = pgTable("Couples_attachment_results", {
  id: uuid("id").primaryKey(),
  session_id: uuid("session_id").notNull(),
  user_id: uuid("user_id").notNull(),
  primary_style: text("primary_style").notNull(), // 'secure', 'anxious', 'avoidant', 'disorganized'
  attachment_scores: jsonb("attachment_scores").notNull(), // { secure: 75, anxious: 45, avoidant: 30, disorganized: 15 }
  resilience_metrics: jsonb("resilience_metrics"), // { self_awareness: 7, coping_strategies: 5 }
  created_at: timestamp("created_at").defaultNow(),
});

export const insertAttachmentResultSchema = createInsertSchema(couplesAttachmentResults).omit({
  id: true,
  created_at: true,
}).extend({
  primary_style: z.enum(["secure", "anxious", "avoidant", "disorganized"]),
  attachment_scores: z.record(z.number()),
  resilience_metrics: z.record(z.number()).optional(),
});
export type InsertAttachmentResult = z.infer<typeof insertAttachmentResultSchema>;
export type AttachmentResult = typeof couplesAttachmentResults.$inferSelect;

// 27. ATTACHMENT DYNAMICS (Couple-level)
export const couplesAttachmentDynamics = pgTable("Couples_attachment_dynamics", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  partner1_style: text("partner1_style").notNull(),
  partner2_style: text("partner2_style").notNull(),
  dynamic_pattern: text("dynamic_pattern"), // e.g., "anxious-avoidant dance"
  conflict_triggers: jsonb("conflict_triggers"), // Common triggers for this pairing
  growth_opportunities: jsonb("growth_opportunities"),
  therapist_notes: text("therapist_notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertAttachmentDynamicsSchema = createInsertSchema(couplesAttachmentDynamics).omit({
  id: true,
  created_at: true,
});
export type InsertAttachmentDynamics = z.infer<typeof insertAttachmentDynamicsSchema>;
export type AttachmentDynamics = typeof couplesAttachmentDynamics.$inferSelect;

// 28. ATTACHMENT TRIGGERS (Moments tracker)
export const couplesAttachmentTriggers = pgTable("Couples_attachment_triggers", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  user_id: uuid("user_id").notNull(),
  trigger_context: text("trigger_context").notNull(),
  intensity: integer("intensity").notNull(), // 1-10
  partner_role: text("partner_role"), // What partner did/said
  my_reaction: text("my_reaction"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertAttachmentTriggerSchema = createInsertSchema(couplesAttachmentTriggers).omit({
  id: true,
  created_at: true,
}).extend({
  trigger_context: z.string().min(1),
  intensity: z.number().min(1).max(10),
});
export type InsertAttachmentTrigger = z.infer<typeof insertAttachmentTriggerSchema>;
export type AttachmentTrigger = typeof couplesAttachmentTriggers.$inferSelect;

// 29. ATTACHMENT REPAIR SCRIPTS
export const couplesAttachmentRepairScripts = pgTable("Couples_attachment_repair_scripts", {
  id: uuid("id").primaryKey(),
  attachment_style: text("attachment_style").notNull(),
  script_title: text("script_title").notNull(),
  script_content: text("script_content").notNull(),
  audience: text("audience").notNull(), // 'self', 'partner', 'couple'
  therapist_curated: boolean("therapist_curated").default(true),
});

export type AttachmentRepairScript = typeof couplesAttachmentRepairScripts.$inferSelect;

// ==============================================
// ENNEAGRAM COUPLE DYNAMICS - Personality-Based Insights
// ==============================================

// 30. ENNEAGRAM QUESTIONS
export const couplesEnneagramQuestions = pgTable("Couples_enneagram_questions", {
  id: integer("id").primaryKey(),
  question_text: text("question_text").notNull(),
  enneagram_type: integer("enneagram_type"), // 1-9, null for multi-type questions
  reverse_scored: boolean("reverse_scored").default(false),
});

export type EnneagramQuestion = typeof couplesEnneagramQuestions.$inferSelect;

// 31. ENNEAGRAM SESSIONS
export const couplesEnneagramSessions = pgTable("Couples_enneagram_sessions", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  user_id: uuid("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
  status: text("status").notNull().default("in_progress"),
});

export const insertEnneagramSessionSchema = createInsertSchema(couplesEnneagramSessions).omit({
  id: true,
  created_at: true,
  completed_at: true,
});
export type InsertEnneagramSession = z.infer<typeof insertEnneagramSessionSchema>;
export type EnneagramSession = typeof couplesEnneagramSessions.$inferSelect;

// 32. ENNEAGRAM RESPONSES
export const couplesEnneagramResponses = pgTable("Couples_enneagram_responses", {
  id: uuid("id").primaryKey(),
  session_id: uuid("session_id").notNull(),
  question_id: integer("question_id").notNull(),
  response_value: integer("response_value").notNull(), // 1-5 Likert scale
  created_at: timestamp("created_at").defaultNow(),
});

export const insertEnneagramResponseSchema = createInsertSchema(couplesEnneagramResponses).omit({
  id: true,
  created_at: true,
}).extend({
  response_value: z.number().min(1).max(5),
});
export type InsertEnneagramResponse = z.infer<typeof insertEnneagramResponseSchema>;
export type EnneagramResponse = typeof couplesEnneagramResponses.$inferSelect;

// 33. ENNEAGRAM RESULTS
export const couplesEnneagramResults = pgTable("Couples_enneagram_results", {
  id: uuid("id").primaryKey(),
  session_id: uuid("session_id").notNull(),
  user_id: uuid("user_id").notNull(),
  dominant_type: integer("dominant_type").notNull(), // 1-9
  wing: integer("wing"), // e.g., 1w2 or 1w9
  stress_number: integer("stress_number"), // Disintegration
  growth_number: integer("growth_number"), // Integration
  tritype_detail: jsonb("tritype_detail"), // { head: 6, heart: 2, gut: 1 }
  enneagram_scores: jsonb("enneagram_scores").notNull(), // { 1: 65, 2: 45, ... 9: 30 }
  reliability_score: integer("reliability_score"), // Confidence in results
  created_at: timestamp("created_at").defaultNow(),
});

export const insertEnneagramResultSchema = createInsertSchema(couplesEnneagramResults).omit({
  id: true,
  created_at: true,
}).extend({
  dominant_type: z.number().min(1).max(9),
  wing: z.number().min(1).max(9).nullable().optional(),
  enneagram_scores: z.record(z.number()),
});
export type InsertEnneagramResult = z.infer<typeof insertEnneagramResultSchema>;
export type EnneagramResult = typeof couplesEnneagramResults.$inferSelect;

// 34. ENNEAGRAM COUPLE REPORTS
export const couplesEnneagramCoupleReports = pgTable("Couples_enneagram_couple_reports", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  partner1_type: integer("partner1_type").notNull(),
  partner2_type: integer("partner2_type").notNull(),
  type_pair: text("type_pair").notNull(), // e.g., "3-9"
  conflict_patterns: jsonb("conflict_patterns"),
  growth_paths: jsonb("growth_paths"),
  communication_tips: jsonb("communication_tips"),
  generated_at: timestamp("generated_at").defaultNow(),
});

export const insertEnneagramCoupleReportSchema = createInsertSchema(couplesEnneagramCoupleReports).omit({
  id: true,
  generated_at: true,
});
export type InsertEnneagramCoupleReport = z.infer<typeof insertEnneagramCoupleReportSchema>;
export type EnneagramCoupleReport = typeof couplesEnneagramCoupleReports.$inferSelect;

// ==============================================
// SHARED COUPLE JOURNAL - Relationship Documentation
// ==============================================

// 35. JOURNAL ENTRIES
export const couplesJournalEntries = pgTable("Couples_journal_entries", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_by: uuid("created_by").notNull(),
  mode: text("mode").notNull(), // 'joint', 'individual'
  visibility: text("visibility").notNull(), // 'private', 'shared_with_partner', 'shared_with_therapist'
  entry_content: text("entry_content").notNull(),
  is_locked: boolean("is_locked").default(false), // For collaborative editing
  joint_lock_expires: timestamp("joint_lock_expires"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(couplesJournalEntries).omit({
  id: true,
  created_at: true,
  updated_at: true,
  is_locked: true,
  joint_lock_expires: true,
}).extend({
  mode: z.enum(["joint", "individual"]),
  visibility: z.enum(["private", "shared_with_partner", "shared_with_therapist"]),
  entry_content: z.string().min(1, "Journal entry cannot be empty"),
});
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof couplesJournalEntries.$inferSelect;

// 36. JOURNAL MEDIA ATTACHMENTS
export const couplesJournalAttachments = pgTable("Couples_journal_attachments", {
  id: uuid("id").primaryKey(),
  entry_id: uuid("entry_id").notNull(),
  storage_path: text("storage_path").notNull(),
  media_type: text("media_type").notNull(), // 'image', 'audio', 'video'
  duration_secs: integer("duration_secs"), // For audio/video
  created_at: timestamp("created_at").defaultNow(),
});

export const insertJournalAttachmentSchema = createInsertSchema(couplesJournalAttachments).omit({
  id: true,
  created_at: true,
}).extend({
  media_type: z.enum(["image", "audio", "video"]),
});
export type InsertJournalAttachment = z.infer<typeof insertJournalAttachmentSchema>;
export type JournalAttachment = typeof couplesJournalAttachments.$inferSelect;

// 37. JOURNAL MILESTONES
export const couplesJournalMilestones = pgTable("Couples_journal_milestones", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  entry_id: uuid("entry_id"), // Optional link to journal entry
  milestone_title: text("milestone_title").notNull(),
  milestone_category: text("milestone_category").notNull(), // 'anniversary', 'breakthrough', 'vacation', 'custom'
  milestone_date: timestamp("milestone_date").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertJournalMilestoneSchema = createInsertSchema(couplesJournalMilestones).omit({
  id: true,
  created_at: true,
}).extend({
  milestone_title: z.string().min(1),
  milestone_category: z.enum(["anniversary", "breakthrough", "vacation", "custom"]),
});
export type InsertJournalMilestone = z.infer<typeof insertJournalMilestoneSchema>;
export type JournalMilestone = typeof couplesJournalMilestones.$inferSelect;

// 38. JOURNAL PROMPTS
export const couplesJournalPrompts = pgTable("Couples_journal_prompts", {
  id: uuid("id").primaryKey(),
  prompt_text: text("prompt_text").notNull(),
  theme_tags: jsonb("theme_tags"), // ['gratitude', 'conflict', 'intimacy']
  therapist_curated: boolean("therapist_curated").default(true),
});

export type JournalPrompt = typeof couplesJournalPrompts.$inferSelect;

// 39. JOURNAL THERAPIST SHARES
export const couplesJournalShares = pgTable("Couples_journal_shares", {
  id: uuid("id").primaryKey(),
  entry_id: uuid("entry_id").notNull(),
  therapist_id: uuid("therapist_id").notNull(),
  couple_id: uuid("couple_id").notNull(),
  permissions: text("permissions").notNull(), // 'read', 'comment'
  shared_at: timestamp("shared_at").defaultNow(),
});

export const insertJournalShareSchema = createInsertSchema(couplesJournalShares).omit({
  id: true,
  shared_at: true,
}).extend({
  permissions: z.enum(["read", "comment"]),
});
export type InsertJournalShare = z.infer<typeof insertJournalShareSchema>;
export type JournalShare = typeof couplesJournalShares.$inferSelect;

// ==============================================
// FINANCIAL COMMUNICATION TOOLKIT - Money Conversations
// ==============================================

// 40. FINANCIAL VALUES
export const couplesFinancialValues = pgTable("Couples_financial_values", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  user_id: uuid("user_id").notNull(),
  priorities: jsonb("priorities").notNull(), // { security: 9, experiences: 7, luxury: 3 }
  completed_at: timestamp("completed_at").defaultNow(),
});

export const insertFinancialValuesSchema = createInsertSchema(couplesFinancialValues).omit({
  id: true,
  completed_at: true,
}).extend({
  priorities: z.record(z.number()),
});
export type InsertFinancialValues = z.infer<typeof insertFinancialValuesSchema>;
export type FinancialValues = typeof couplesFinancialValues.$inferSelect;

// 41. BUDGET CATEGORIES
export const couplesBudgetCategories = pgTable("Couples_budget_categories", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  category_name: text("category_name").notNull(),
  category_type: text("category_type").notNull(), // 'income', 'expense', 'savings'
  monthly_limit: numeric("monthly_limit"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertBudgetCategorySchema = createInsertSchema(couplesBudgetCategories).omit({
  id: true,
  created_at: true,
}).extend({
  category_name: z.string().min(1),
  category_type: z.enum(["income", "expense", "savings"]),
});
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;
export type BudgetCategory = typeof couplesBudgetCategories.$inferSelect;

// 42. BUDGET ENTRIES
export const couplesBudgetEntries = pgTable("Couples_budget_entries", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  category_id: uuid("category_id").notNull(),
  user_id: uuid("user_id").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  entry_date: timestamp("entry_date").notNull(),
  external_source_id: text("external_source_id"), // For Plaid integration
  metadata: jsonb("metadata"), // Merchant info, tags, etc.
  created_at: timestamp("created_at").defaultNow(),
});

export const insertBudgetEntrySchema = createInsertSchema(couplesBudgetEntries).omit({
  id: true,
  created_at: true,
}).extend({
  amount: z.string(), // Numeric fields are strings in Drizzle
  entry_date: z.date(),
});
export type InsertBudgetEntry = z.infer<typeof insertBudgetEntrySchema>;
export type BudgetEntry = typeof couplesBudgetEntries.$inferSelect;

// 43. FINANCIAL GOALS
export const couplesFinancialGoals = pgTable("Couples_financial_goals", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  goal_title: text("goal_title").notNull(),
  target_amount: numeric("target_amount").notNull(),
  current_progress: numeric("current_progress").default("0"),
  due_date: timestamp("due_date"),
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

export const insertFinancialGoalSchema = createInsertSchema(couplesFinancialGoals).omit({
  id: true,
  created_at: true,
  completed_at: true,
}).extend({
  goal_title: z.string().min(1),
  target_amount: z.string(),
  current_progress: z.string().optional(),
});
export type InsertFinancialGoal = z.infer<typeof insertFinancialGoalSchema>;
export type FinancialGoal = typeof couplesFinancialGoals.$inferSelect;

// 44. SPENDING PLEDGES
export const couplesSpendingPledges = pgTable("Couples_spending_pledges", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  threshold_amount: numeric("threshold_amount").notNull(),
  notification_channel: text("notification_channel").notNull(), // 'app', 'email', 'sms'
  created_at: timestamp("created_at").defaultNow(),
});

export const insertSpendingPledgeSchema = createInsertSchema(couplesSpendingPledges).omit({
  id: true,
  created_at: true,
}).extend({
  threshold_amount: z.string(),
  notification_channel: z.enum(["app", "email", "sms"]),
});
export type InsertSpendingPledge = z.infer<typeof insertSpendingPledgeSchema>;
export type SpendingPledge = typeof couplesSpendingPledges.$inferSelect;

// 45. SPENDING PATTERNS
export const couplesSpendingPatterns = pgTable("Couples_spending_patterns", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  pattern_statistics: jsonb("pattern_statistics").notNull(), // Rolling averages, trends
  coverage_window: text("coverage_window").notNull(), // 'monthly', 'quarterly', 'yearly'
  analyzed_at: timestamp("analyzed_at").defaultNow(),
});

export type SpendingPattern = typeof couplesSpendingPatterns.$inferSelect;

// ==============================================
// AI-POWERED DATE NIGHT GENERATOR - Enhanced Version
// ==============================================

// 46. DATE PREFERENCES
export const couplesDatePreferences = pgTable("Couples_date_preferences", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull().unique(),
  categories: jsonb("categories").notNull(), // ['adventure', 'relaxation', 'culture']
  constraints: jsonb("constraints"), // { budget: 'moderate', accessibility: true }
  budget_level: text("budget_level"), // 'free', 'budget', 'moderate', 'splurge'
  accessibility_needs: text("accessibility_needs"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertDatePreferencesSchema = createInsertSchema(couplesDatePreferences).omit({
  id: true,
  updated_at: true,
}).extend({
  categories: z.array(z.string()),
  constraints: z.record(z.any()).optional(),
  budget_level: z.enum(["free", "budget", "moderate", "splurge"]).optional(),
});
export type InsertDatePreferences = z.infer<typeof insertDatePreferencesSchema>;
export type DatePreferences = typeof couplesDatePreferences.$inferSelect;

// 47. DATE IDEAS
export const couplesDateIdeas = pgTable("Couples_date_ideas", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  origin: text("origin").notNull(), // 'ai', 'manual'
  prompt_snapshot: jsonb("prompt_snapshot"), // What was asked from AI
  recommendation: jsonb("recommendation").notNull(), // Full date details
  saved_by: uuid("saved_by"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertDateIdeaSchema = createInsertSchema(couplesDateIdeas).omit({
  id: true,
  created_at: true,
}).extend({
  origin: z.enum(["ai", "manual"]),
  recommendation: z.record(z.any()),
});
export type InsertDateIdea = z.infer<typeof insertDateIdeaSchema>;
export type DateIdea = typeof couplesDateIdeas.$inferSelect;

// 48. DATE FEEDBACK
export const couplesDateFeedback = pgTable("Couples_date_feedback", {
  id: uuid("id").primaryKey(),
  idea_id: uuid("idea_id").notNull(),
  couple_id: uuid("couple_id").notNull(),
  rating: integer("rating"), // 1-5 stars
  reflection_text: text("reflection_text"),
  therapy_alignment: jsonb("therapy_alignment"), // Tags like ['vulnerability', 'quality_time']
  completed_on: timestamp("completed_on"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertDateFeedbackSchema = createInsertSchema(couplesDateFeedback).omit({
  id: true,
  created_at: true,
}).extend({
  rating: z.number().min(1).max(5).optional(),
  therapy_alignment: z.array(z.string()).optional(),
});
export type InsertDateFeedback = z.infer<typeof insertDateFeedbackSchema>;
export type DateFeedback = typeof couplesDateFeedback.$inferSelect;
