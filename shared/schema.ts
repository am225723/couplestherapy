import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Note: These schemas match the Supabase tables with Couples_ prefix
// The actual tables are created directly in Supabase via SQL

// Love Language Types
export const LOVE_LANGUAGES = [
  "Words of Affirmation",
  "Quality Time",
  "Receiving Gifts",
  "Acts of Service",
  "Physical Touch",
] as const;

export type LoveLanguageType = (typeof LOVE_LANGUAGES)[number];

export interface QuizQuestion {
  id: number;
  optionA: { text: string; language: LoveLanguageType };
  optionB: { text: string; language: LoveLanguageType };
}

// 1. PROFILES TABLE
export const couplesProfiles = pgTable("Couples_profiles", {
  id: uuid("id").primaryKey(),
  full_name: text("full_name"),
  role: text("role").notNull(), // 'therapist' or 'client'
  couple_id: uuid("couple_id"),
  avatar_url: text("avatar_url"),
  expo_push_token: text("expo_push_token"), // Mobile (Expo) push notification token
  fcm_token: text("fcm_token"), // Web (Firebase Cloud Messaging) push notification token
});

export const insertProfileSchema = createInsertSchema(couplesProfiles).omit({
  id: true,
});
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: uuid("couple_id"), // Optional - may not exist in all Supabase instances
  user_id: uuid("user_id").notNull(),
  primary_language: text("primary_language"),
  secondary_language: text("secondary_language"),
  scores: jsonb("scores"), // { words_of_affirmation: 8, quality_time: 6, ... }
  created_at: timestamp("created_at").defaultNow(),
});

export const insertLoveLanguageSchema = createInsertSchema(couplesLoveLanguages)
  .omit({ id: true, created_at: true, couple_id: true })
  .extend({
    scores: z.record(z.number()),
    couple_id: z.string().uuid().optional(),
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

export const insertGratitudeLogSchema = createInsertSchema(couplesGratitudeLogs)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    text_content: z.string().nullable().optional(),
    image_url: z.string().min(1).nullable().optional(), // Storage path, not URL
  })
  .refine((data) => data.text_content || data.image_url, {
    message: "Either text content or image must be provided",
  });
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

export const insertWeeklyCheckinSchema = createInsertSchema(
  couplesWeeklyCheckins,
)
  .omit({
    id: true,
    created_at: true,
    week_number: true, // Auto-calculated by database trigger
    year: true, // Auto-calculated by database trigger
  })
  .extend({
    q_connectedness: z.number().min(1).max(10),
    q_conflict: z.number().min(1).max(10),
    q_appreciation: z.string().min(1, "Please share what you appreciated"),
    q_regrettable_incident: z
      .string()
      .min(1, "Please share the regrettable incident"),
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

export const insertSharedGoalSchema = createInsertSchema(couplesSharedGoals)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
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
  private_note: boolean("private_note").default(false),
  category: text("category"), // 'general', 'followup', 'alert'
});

export const insertTherapistCommentSchema = createInsertSchema(
  couplesTherapistComments,
)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    comment_text: z.string().min(1),
  });
export type InsertTherapistComment = z.infer<
  typeof insertTherapistCommentSchema
>;
export type TherapistComment = typeof couplesTherapistComments.$inferSelect;

// 8. LOVE MAP QUIZ COMPONENTS
export const couplesLoveMapQuizzes = pgTable("Couples_love_map_quizzes", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  status: text("status").default("active"), // 'active', 'completed'
});

export type LoveMapQuiz = typeof couplesLoveMapQuizzes.$inferSelect;

// 9. LOVE MAP QUESTIONS
export const couplesLoveMapQuestions = pgTable("Couples_love_map_questions", {
  id: uuid("id").primaryKey(),
  quiz_id: uuid("quiz_id").notNull(),
  question_text: text("question_text").notNull(),
  phase: text("phase").notNull(), // 'truths', 'guesses', 'results'
  question_order: integer("question_order"),
});

export type LoveMapQuestion = typeof couplesLoveMapQuestions.$inferSelect;

// 10. LOVE MAP RESPONSES
export const couplesLoveMapResponses = pgTable("Couples_love_map_responses", {
  id: uuid("id").primaryKey(),
  question_id: uuid("question_id").notNull(),
  respondent_id: uuid("respondent_id").notNull(),
  response_text: text("response_text"),
  guess_from_partner: text("guess_from_partner"),
});

export type LoveMapResponse = typeof couplesLoveMapResponses.$inferSelect;

// 11. VOICE MEMOS
export const couplesVoiceMemos = pgTable("Couples_voice_memos", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_by: uuid("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  audio_url: text("audio_url"), // Supabase Storage path
  duration_seconds: integer("duration_seconds"),
  transcript: text("transcript"),
  sentiment_score: numeric("sentiment_score"), // -1 to 1 (negative to positive)
  sentiment_label: text("sentiment_label"), // 'negative', 'neutral', 'positive'
});

export const insertVoiceMemoSchema = createInsertSchema(couplesVoiceMemos)
  .omit({
    id: true,
    created_at: true,
    transcript: true,
    sentiment_score: true,
    sentiment_label: true,
  })
  .extend({
    audio_url: z.string().min(1),
  });
export type InsertVoiceMemo = z.infer<typeof insertVoiceMemoSchema>;
export type VoiceMemo = typeof couplesVoiceMemos.$inferSelect;

// 12. MESSAGES (SECURE)
export const couplesMessages = pgTable("Couples_messages", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  sender_id: uuid("sender_id").notNull(),
  message_text: text("message_text").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(couplesMessages)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    message_text: z.string().min(1),
  });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof couplesMessages.$inferSelect;

// 13. SHARED CALENDAR EVENTS
export const couplesCalendarEvents = pgTable("Couples_calendar_events", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_by: uuid("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  event_title: text("event_title").notNull(),
  event_date: timestamp("event_date").notNull(),
  description: text("description"),
  location: text("location"),
});

export const insertCalendarEventSchema = createInsertSchema(
  couplesCalendarEvents,
)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    event_title: z.string().min(1),
    event_date: z.date().or(z.string()),
  });
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof couplesCalendarEvents.$inferSelect;

// 14. PAUSE BUTTON (SHARED PAUSE BUTTON)
export const couplesPauseButtons = pgTable("Couples_pause_buttons", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  activated_by: uuid("activated_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  ended_at: timestamp("ended_at"),
  reason: text("reason"),
});

export const insertPauseButtonSchema = createInsertSchema(
  couplesPauseButtons,
).omit({
  id: true,
  created_at: true,
  ended_at: true,
});
export type InsertPauseButton = z.infer<typeof insertPauseButtonSchema>;
export type PauseButton = typeof couplesPauseButtons.$inferSelect;

// 15. ECHO & EMPATHY SESSIONS
export const couplesEchoEmpathySessions = pgTable(
  "Couples_echo_empathy_sessions",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    speaker_id: uuid("speaker_id").notNull(),
    listener_id: uuid("listener_id").notNull(),
    speaker_statement: text("speaker_statement"),
    listener_echo: text("listener_echo"),
    listener_validation: text("listener_validation"),
    listener_empathy: text("listener_empathy"),
    speaker_reflection: text("speaker_reflection"),
  },
);

export const insertEchoEmpathySessionSchema = createInsertSchema(
  couplesEchoEmpathySessions,
).omit({
  id: true,
  created_at: true,
});
export type InsertEchoEmpathySession = z.infer<
  typeof insertEchoEmpathySessionSchema
>;
export type EchoEmpathySession = typeof couplesEchoEmpathySessions.$inferSelect;

// 16. IFS EXERCISES
export const couplesIFSExercises = pgTable("Couples_ifs_exercises", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  user_id: uuid("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  exercise_type: text("exercise_type"), // 'introduction', 'part_identification', 'dialogue'
  parts_identified: jsonb("parts_identified"), // Array of identified parts
  insights_captured: text("insights_captured"),
});

export const insertIFSExerciseSchema = createInsertSchema(
  couplesIFSExercises,
).omit({
  id: true,
  created_at: true,
});
export type InsertIFSExercise = z.infer<typeof insertIFSExerciseSchema>;
export type IFSExercise = typeof couplesIFSExercises.$inferSelect;

// 17. RITUALS OF CONNECTION
export const couplesRitualsOfConnection = pgTable(
  "Couples_rituals_of_connection",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    ritual_title: text("ritual_title").notNull(),
    description: text("description"),
    frequency: text("frequency"), // 'daily', 'weekly', 'monthly'
    last_performed: timestamp("last_performed"),
  },
);

export const insertRitualOfConnectionSchema = createInsertSchema(
  couplesRitualsOfConnection,
)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    ritual_title: z.string().min(1),
  });
export type InsertRitualOfConnection = z.infer<
  typeof insertRitualOfConnectionSchema
>;
export type RitualOfConnection = typeof couplesRitualsOfConnection.$inferSelect;

// 18. HOLD ME TIGHT - EFT STRUCTURED CONVERSATIONS
export const couplesHoldMeTightConversations = pgTable(
  "Couples_hold_me_tight_conversations",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    status: text("status").default("active"), // 'active', 'completed'
    speaker_id: uuid("speaker_id"),
    round: integer("round"), // Which round (1-3)
  },
);

export type HoldMeTightConversation =
  typeof couplesHoldMeTightConversations.$inferSelect;

// 19. DAILY RITUALS
export const couplesDailyRituals = pgTable("Couples_daily_rituals", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  ritual_name: text("ritual_name").notNull(),
  time_of_day: text("time_of_day"),
  description: text("description"),
  is_active: boolean("is_active").default(true),
});

export const insertDailyRitualSchema = createInsertSchema(couplesDailyRituals)
  .omit({
    id: true,
  })
  .extend({
    ritual_name: z.string().min(1),
  });
export type InsertDailyRitual = z.infer<typeof insertDailyRitualSchema>;
export type DailyRitual = typeof couplesDailyRituals.$inferSelect;

// 20. LOVE MAP QUIZ - V2
export const couplesLoveMapQuizzesV2 = pgTable("Couples_love_map_quizzes_v2", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  phase: text("phase").notNull(), // 'truths', 'guesses', 'results'
  current_question_index: integer("current_question_index").default(0),
  is_completed: boolean("is_completed").default(false),
});

export const insertLoveMapQuizV2Schema = createInsertSchema(
  couplesLoveMapQuizzesV2,
).omit({
  id: true,
  created_at: true,
});
export type InsertLoveMapQuizV2 = z.infer<typeof insertLoveMapQuizV2Schema>;
export type LoveMapQuizV2 = typeof couplesLoveMapQuizzesV2.$inferSelect;

// 21. LOVE MAP ANSWERS - V2
export const couplesLoveMapAnswersV2 = pgTable("Couples_love_map_answers_v2", {
  id: uuid("id").primaryKey(),
  quiz_id: uuid("quiz_id").notNull(),
  question_id: uuid("question_id").notNull(),
  respondent_id: uuid("respondent_id").notNull(),
  answer_text: text("answer_text"),
  answer_index: integer("answer_index"),
  is_guess: boolean("is_guess").default(false),
});

export type LoveMapAnswerV2 = typeof couplesLoveMapAnswersV2.$inferSelect;

// 22. MOOD TRACKER
export const couplesMoodEntries = pgTable("Couples_mood_entries", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  user_id: uuid("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  mood_level: integer("mood_level").notNull(), // 1-10
  emotion_primary: text("emotion_primary"),
  emotion_secondary: text("emotion_secondary"),
  notes: text("notes"),
});

export const insertMoodEntrySchema = createInsertSchema(couplesMoodEntries)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    mood_level: z.number().min(1).max(10),
    emotion_primary: z.string().min(1),
    emotion_secondary: z.string().optional(),
    notes: z.string().optional(),
  });
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type MoodEntry = typeof couplesMoodEntries.$inferSelect;

// 23. DAILY TIPS
export const couplesDailyTips = pgTable("Couples_daily_tips", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  tip_text: text("tip_text").notNull(),
  category: text("category").notNull(), // 'communication', 'intimacy', 'conflict', 'gratitude', 'connection', 'growth'
  source: text("source").default("ai"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertDailyTipSchema = createInsertSchema(couplesDailyTips)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    tip_text: z.string().min(1),
    category: z.enum([
      "communication",
      "intimacy",
      "conflict",
      "gratitude",
      "connection",
      "growth",
    ]),
  });
export type InsertDailyTip = z.infer<typeof insertDailyTipSchema>;
export type DailyTip = typeof couplesDailyTips.$inferSelect;

// 24. NOTIFICATION PREFERENCES
export const couplesNotificationPreferences = pgTable(
  "Couples_notification_preferences",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    user_id: uuid("user_id").notNull(),
    tips_enabled: boolean("tips_enabled").default(true),
    tips_frequency: text("tips_frequency").default("daily"), // 'daily', 'weekly'
    tips_time: text("tips_time").default("08:00:00"),
    push_notifications_enabled: boolean("push_notifications_enabled").default(true),
    email_notifications_enabled: boolean("email_notifications_enabled").default(false),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
);

export const insertNotificationPreferencesSchema = createInsertSchema(
  couplesNotificationPreferences,
).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertNotificationPreferences = z.infer<
  typeof insertNotificationPreferencesSchema
>;
export type NotificationPreferences =
  typeof couplesNotificationPreferences.$inferSelect;

// 25. NOTIFICATION HISTORY
export const couplesNotificationHistory = pgTable(
  "Couples_notification_history",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    tip_id: uuid("tip_id"),
    sent_at: timestamp("sent_at").defaultNow(),
    notification_type: text("notification_type"), // 'push', 'email'
  },
);

export type NotificationHistory =
  typeof couplesNotificationHistory.$inferSelect;

// 26. CHORE CHART
export const couplesChores = pgTable("Couples_chores", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  title: text("title").notNull(),
  assigned_to: uuid("assigned_to").notNull(),
  recurrence: text("recurrence").notNull(), // 'daily', 'weekly', 'monday', 'tuesday', etc.
  created_at: timestamp("created_at").defaultNow(),
  is_completed: boolean("is_completed").default(false),
  completed_by: uuid("completed_by"),
  completed_at: timestamp("completed_at"),
});

export const insertChoreSchema = createInsertSchema(couplesChores)
  .omit({
    id: true,
    created_at: true,
    is_completed: true,
    completed_by: true,
    completed_at: true,
  })
  .extend({
    title: z.string().min(1, "Chore title is required"),
    recurrence: z.enum([
      "daily",
      "weekly",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
  });
export type InsertChore = z.infer<typeof insertChoreSchema>;
export type Chore = typeof couplesChores.$inferSelect;

// ============ LOVE LANGUAGE RESULTS ============
export const couplesLoveLanguageResults = pgTable(
  "Couples_love_language_results",
  {
    id: uuid("id").primaryKey(),
    user_id: uuid("user_id").notNull(),
    couple_id: uuid("couple_id"),
    created_at: timestamp("created_at").defaultNow(),
    primary_language: text("primary_language"),
    secondary_language: text("secondary_language"),
    all_scores: jsonb("all_scores"), // All 5 languages
  },
);

export type LoveLanguageResult = typeof couplesLoveLanguageResults.$inferSelect;

// ATTACHMENT STYLE ASSESSMENT
export const couplesAttachmentAssessments = pgTable(
  "Couples_attachment_assessments",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    user_id: uuid("user_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    attachment_style: text("attachment_style"), // 'secure', 'anxious', 'avoidant', 'fearful-avoidant'
    score: integer("score"),
    dynamics_with_partner: text("dynamics_with_partner"),
    triggers: jsonb("triggers"), // Array of common triggers
    repair_strategies: jsonb("repair_strategies"), // Array of recommended repair strategies
  },
);

export type AttachmentAssessment =
  typeof couplesAttachmentAssessments.$inferSelect;

// ENNEAGRAM ASSESSMENT
export const couplesEnneagramAssessments = pgTable(
  "Couples_enneagram_assessments",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    user_id: uuid("user_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    primary_type: integer("primary_type"), // 1-9
    secondary_type: integer("secondary_type"),
    primary_score: integer("primary_score"),
    secondary_score: integer("secondary_score"),
    couple_dynamics: text("couple_dynamics"),
  },
);

export type EnneagramAssessment =
  typeof couplesEnneagramAssessments.$inferSelect;

// COUPLE JOURNAL
export const couplesJournalEntries = pgTable("Couples_journal_entries", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_by: uuid("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  entry_type: text("entry_type"), // 'reflection', 'milestone', 'memory', 'moment'
  title: text("title"),
  content: text("content"),
  privacy_level: text("privacy_level").default("couple"), // 'private', 'couple', 'therapist'
  media_urls: jsonb("media_urls"), // Array of storage paths
  mood: text("mood"),
  tags: jsonb("tags"), // Array of tags
  is_milestone: boolean("is_milestone").default(false),
});

export const insertJournalEntrySchema = createInsertSchema(
  couplesJournalEntries,
)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    entry_type: z.enum(["reflection", "milestone", "memory", "moment"]),
    privacy_level: z.enum(["private", "couple", "therapist"]).optional(),
    media_urls: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof couplesJournalEntries.$inferSelect;

// FINANCIAL COMMUNICATION
export const couplesFinancialToolkit = pgTable("Couples_financial_toolkit", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  values_alignment: jsonb("values_alignment"), // {money_goals, financial_priorities}
  budget_items: jsonb("budget_items"), // Array of budget items
  shared_goals: jsonb("shared_goals"), // Array of financial goals
  discussion_log: jsonb("discussion_log"), // Array of past discussions
});

export type FinancialToolkit = typeof couplesFinancialToolkit.$inferSelect;

// CONNECTION CONCIERGE
export const couplesConnectionConcierge = pgTable(
  "Couples_connection_concierge",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    topic: text("topic"), // Topic for AI recommendations
    recommendations: jsonb("recommendations"), // Array of AI-generated recommendations
    user_feedback: text("user_feedback"),
  },
);

export type ConnectionConcierge =
  typeof couplesConnectionConcierge.$inferSelect;

// 38. THERAPIST ANALYTICS
export const couplesTherapistAnalytics = pgTable(
  "Couples_therapist_analytics",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    therapist_id: uuid("therapist_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    insights: jsonb("insights"), // AI-generated insights
    recommendations: jsonb("recommendations"), // Recommended interventions
    risk_factors: jsonb("risk_factors"), // Identified risk factors
  },
);

export type TherapistAnalytics = typeof couplesTherapistAnalytics.$inferSelect;

// 39. THERAPIST THOUGHTS (Replacement for Messages)
export const couplesTherapistThoughts = pgTable("Couples_therapist_thoughts", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  therapist_id: uuid("therapist_id").notNull(),
  individual_id: uuid("individual_id"), // Optional: target specific partner, null = both partners
  created_at: timestamp("created_at").defaultNow(),
  thought_type: text("thought_type").notNull(), // 'todo', 'message', 'file_reference'
  title: text("title"),
  content: text("content").notNull(),
  priority: text("priority").default("medium"), // 'low', 'medium', 'high'
  is_completed: boolean("is_completed").default(false),
  file_reference: text("file_reference"),
});

export const insertTherapistThoughtSchema = createInsertSchema(
  couplesTherapistThoughts,
)
  .omit({
    id: true,
    created_at: true,
    is_completed: true,
  })
  .extend({
    thought_type: z.enum(["todo", "message", "file_reference"]),
    title: z.string().optional(),
    content: z.string().min(1),
    priority: z.enum(["low", "medium", "high"]).optional(),
    individual_id: z.string().uuid().optional().nullable(),
  });
export type InsertTherapistThought = z.infer<
  typeof insertTherapistThoughtSchema
>;
export type TherapistThought = typeof couplesTherapistThoughts.$inferSelect;

// =========== DATE NIGHT GENERATOR - ENHANCED ===========

// 40. DATE NIGHTS GENERATED
export const couplesDateNights = pgTable("Couples_date_nights", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  date_night_plan: jsonb("date_night_plan").notNull(), // Full plan from AI
  category: text("category"),
  status: text("status").default("suggested"), // 'suggested', 'scheduled', 'completed'
  scheduled_date: timestamp("scheduled_date"),
  feedback: text("feedback"),
});

export type DateNight = typeof couplesDateNights.$inferSelect;

// FOUR HORSEMEN DETECTOR
export const couplesFourHorsemenEntries = pgTable(
  "Couples_four_horsemen_entries",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    user_id: uuid("user_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    horseman_type: text("horseman_type"), // 'criticism', 'contempt', 'defensiveness', 'stonewalling'
    description: text("description"),
    severity: integer("severity"), // 1-5
    context: text("context"),
  },
);

export const insertFourHorsemenSchema = createInsertSchema(
  couplesFourHorsemenEntries,
)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    horseman_type: z.enum([
      "criticism",
      "contempt",
      "defensiveness",
      "stonewalling",
    ]),
    severity: z.number().min(1).max(5),
  });
export type InsertFourHorsemen = z.infer<typeof insertFourHorsemenSchema>;
export type FourHorsemen = typeof couplesFourHorsemenEntries.$inferSelect;

// DEMON DIALOGUES
export const couplesDemonDialogues = pgTable("Couples_demon_dialogues", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  dialogue_type: text("dialogue_type"), // 'pursue-withdraw', 'attack-defend', 'withdraw-pursue'
  description: text("description"),
  triggers: jsonb("triggers"),
  resolution_strategies: jsonb("resolution_strategies"),
});

export type DemonDialogue = typeof couplesDemonDialogues.$inferSelect;

// 42. FINANCIAL DISCUSSION LOGS
export const couplesFinancialDiscussionLogs = pgTable(
  "Couples_financial_discussion_logs",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull(),
    created_by: uuid("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    topic: text("topic").notNull(),
    notes: text("notes"),
    decisions_made: jsonb("decisions_made"),
    follow_up_items: jsonb("follow_up_items"),
  },
);

export type FinancialDiscussionLog =
  typeof couplesFinancialDiscussionLogs.$inferSelect;

// 43. FINANCIAL GOALS
export const couplesFinancialGoals = pgTable("Couples_financial_goals", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  goal_title: text("goal_title").notNull(),
  target_amount: numeric("target_amount"),
  current_progress: numeric("current_progress").default("0"),
  due_date: timestamp("due_date"),
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

export const insertFinancialGoalSchema = createInsertSchema(
  couplesFinancialGoals,
)
  .omit({
    id: true,
    created_at: true,
    completed_at: true,
  })
  .extend({
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

export const insertSpendingPledgeSchema = createInsertSchema(
  couplesSpendingPledges,
)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
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

export const insertDatePreferencesSchema = createInsertSchema(
  couplesDatePreferences,
)
  .omit({
    id: true,
    updated_at: true,
  })
  .extend({
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

export const insertDateIdeaSchema = createInsertSchema(couplesDateIdeas)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
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

export const insertDateFeedbackSchema = createInsertSchema(couplesDateFeedback)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    rating: z.number().min(1).max(5).optional(),
    therapy_alignment: z.array(z.string()).optional(),
  });
export type InsertDateFeedback = z.infer<typeof insertDateFeedbackSchema>;
export type DateFeedback = typeof couplesDateFeedback.$inferSelect;

// 27. DASHBOARD CUSTOMIZATION
export const couplesDashboardCustomization = pgTable(
  "Couples_dashboard_customization",
  {
    id: uuid("id").primaryKey(),
    couple_id: uuid("couple_id").notNull().unique(),
    therapist_id: uuid("therapist_id").notNull(),
    widget_order: jsonb("widget_order")
      .notNull()
      .default(
        '["weekly-checkin","love-languages","gratitude","shared-goals","conversations","love-map","voice-memos","calendar","rituals"]',
      ),
    enabled_widgets: jsonb("enabled_widgets")
      .notNull()
      .default(
        '{"weekly-checkin":true,"love-languages":true,"gratitude":true,"shared-goals":true,"conversations":true,"love-map":true,"voice-memos":true,"calendar":true,"rituals":true}',
      ),
    widget_sizes: jsonb("widget_sizes")
      .notNull()
      .default(
        '{"weekly-checkin":"medium","love-languages":"medium","gratitude":"medium","shared-goals":"medium","conversations":"medium","love-map":"medium","voice-memos":"medium","calendar":"medium","rituals":"medium"}',
      ),
    // Widget-specific content customization (title, description, section visibility)
    widget_content_overrides: jsonb("widget_content_overrides").default("{}"),
    updated_at: timestamp("updated_at").defaultNow(),
  },
);

export type DashboardCustomization =
  typeof couplesDashboardCustomization.$inferSelect;

// Type for widget content overrides
export interface WidgetContentOverride {
  title?: string;
  description?: string;
  showMessages?: boolean;
  showTodos?: boolean;
  showResources?: boolean;
}

export type WidgetContentOverrides = Record<string, WidgetContentOverride>;

// 28. SCHEDULED NOTIFICATIONS
export const couplesScheduledNotifications = pgTable(
  "Couples_scheduled_notifications",
  {
    id: uuid("id").primaryKey(),
    therapist_id: uuid("therapist_id").notNull(),
    couple_id: uuid("couple_id").notNull(),
    user_id: uuid("user_id"), // Optional - if null, send to both partners
    title: text("title").notNull(),
    body: text("body").notNull(),
    scheduled_at: timestamp("scheduled_at").notNull(),
    sent_at: timestamp("sent_at"),
    status: text("status").default("pending"), // 'pending', 'sent', 'failed'
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
);

export const insertScheduledNotificationSchema = createInsertSchema(
  couplesScheduledNotifications,
).omit({
  id: true,
  sent_at: true,
  status: true,
  created_at: true,
  updated_at: true,
});
export type InsertScheduledNotification = z.infer<
  typeof insertScheduledNotificationSchema
>;
export type ScheduledNotification =
  typeof couplesScheduledNotifications.$inferSelect;

// ===== CONSTANTS =====

export const RITUAL_CATEGORIES = [
  "morning_connection",
  "evening_wind_down",
  "date_night",
  "gratitude",
  "intimacy",
  "communication",
] as const;

export type RitualCategory = (typeof RITUAL_CATEGORIES)[number];

export const DASHBOARD_WIDGETS = [
  "weekly-checkin",
  "love-languages",
  "gratitude",
  "shared-goals",
  "conversations",
  "love-map",
  "voice-memos",
  "calendar",
  "rituals",
] as const;

// 29. THERAPIST PROMPTS - Custom prompts/suggestions therapists can set for couples or individuals
export const couplesTherapistPrompts = pgTable("Couples_therapist_prompts", {
  id: uuid("id").primaryKey(),
  couple_id: uuid("couple_id").notNull(),
  therapist_id: uuid("therapist_id").notNull(),
  target_user_id: uuid("target_user_id"), // Optional: if set, prompt is only for this specific partner
  tool_name: text("tool_name").notNull(), // e.g., "weekly-checkin", "gratitude", "shared-goals", "reflection"
  title: text("title").notNull(), // Display title
  description: text("description"), // Description of the activity
  suggested_action: text("suggested_action").notNull(), // The prompt/suggestion for the couple
  is_enabled: boolean("is_enabled").default(true),
  display_order: integer("display_order").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertTherapistPromptSchema = createInsertSchema(
  couplesTherapistPrompts,
).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertTherapistPrompt = z.infer<typeof insertTherapistPromptSchema>;
export type TherapistPrompt = typeof couplesTherapistPrompts.$inferSelect;

// 29b. REFLECTION RESPONSES - Couple responses to therapist-initiated reflection prompts
export const couplesReflectionResponses = pgTable("Couples_reflection_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt_id: uuid("prompt_id").notNull(), // FK to Couples_therapist_prompts
  couple_id: uuid("couple_id").notNull(),
  responder_id: uuid("responder_id").notNull(), // FK to Couples_profiles (which partner responded)
  response_text: text("response_text").notNull(),
  is_shared_with_partner: boolean("is_shared_with_partner").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertReflectionResponseSchema = createInsertSchema(
  couplesReflectionResponses,
).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertReflectionResponse = z.infer<typeof insertReflectionResponseSchema>;
export type ReflectionResponse = typeof couplesReflectionResponses.$inferSelect;

// ============ MODULE SUBSCRIPTIONS ============

// 30. AVAILABLE MODULES - Registry of purchasable modules
export const couplesModules = pgTable("Couples_modules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(), // 'chores', 'ifs', 'conflict-resolution'
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"), // Lucide icon name
  app_url: text("app_url"), // URL to the external Replit app
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertModuleSchema = createInsertSchema(couplesModules).omit({
  id: true,
  created_at: true,
});
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof couplesModules.$inferSelect;

// Module pricing is stored in Stripe products/prices with metadata:
// - product metadata: { module_slug: 'chores', type: 'module' }
// - price metadata: { interval: 'month' | 'year' }

// 31. USER MODULE SUBSCRIPTIONS - Per-user access to modules
export const couplesModuleSubscriptions = pgTable("Couples_module_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull(), // Per-user, not per-couple
  module_id: uuid("module_id").notNull(),
  stripe_subscription_id: text("stripe_subscription_id"),
  stripe_customer_id: text("stripe_customer_id"),
  status: text("status").notNull().default("active"), // 'active', 'canceled', 'past_due', 'trialing'
  current_period_start: timestamp("current_period_start"),
  current_period_end: timestamp("current_period_end"),
  cancel_at_period_end: boolean("cancel_at_period_end").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertModuleSubscriptionSchema = createInsertSchema(
  couplesModuleSubscriptions,
).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertModuleSubscription = z.infer<typeof insertModuleSubscriptionSchema>;
export type ModuleSubscription = typeof couplesModuleSubscriptions.$inferSelect;

// 32. MODULE ACCESS TOKENS - Short-lived tokens for secure module access
export const couplesModuleAccessTokens = pgTable("Couples_module_access_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull(),
  module_id: uuid("module_id").notNull(),
  token_hash: text("token_hash").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export type ModuleAccessToken = typeof couplesModuleAccessTokens.$inferSelect;

// Available module slugs
export const MODULE_SLUGS = ["chores", "ifs", "conflict-resolution"] as const;
export type ModuleSlug = (typeof MODULE_SLUGS)[number];

// ============ CONFLICT RESOLUTION MODULE ============

// 33. CONFLICT SESSIONS - Saved I-Statement sessions
export const couplesConflictSessions = pgTable("Couples_conflict_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull(),
  couple_id: uuid("couple_id").notNull(),
  
  // Input mode and free-form text
  input_mode: text("input_mode").default("structured"), // "express" or "structured"
  free_text: text("free_text"), // For Express Freely mode
  
  // I-Statement components (for structured mode)
  feeling: text("feeling").notNull().default(""),
  situation: text("situation").notNull().default(""),
  because: text("because").notNull().default(""),
  request: text("request").notNull().default(""),
  
  // Generated content
  firmness: integer("firmness").notNull().default(50),
  enhanced_statement: text("enhanced_statement"),
  impact_preview: text("impact_preview"),
  ai_suggestions: jsonb("ai_suggestions").default([]),
  
  // Metadata
  title: text("title"),
  is_favorite: boolean("is_favorite").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertConflictSessionSchema = createInsertSchema(
  couplesConflictSessions,
).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  input_mode: z.enum(["express", "structured"]).optional(),
  free_text: z.string().nullable().optional(),
  ai_suggestions: z.array(z.object({
    title: z.string(),
    content: z.string(),
    category: z.string(),
  })).optional(),
});
export type InsertConflictSession = z.infer<typeof insertConflictSessionSchema>;
export type ConflictSession = typeof couplesConflictSessions.$inferSelect;

// 34. CONFLICT AI EVENTS - Audit log for AI interactions
export const couplesConflictAiEvents = pgTable("Couples_conflict_ai_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: uuid("session_id"),
  user_id: uuid("user_id").notNull(),
  request_type: text("request_type").notNull(), // 'generate_statement' | 'generate_suggestions'
  prompt_payload: jsonb("prompt_payload").notNull(),
  response_text: text("response_text"),
  response_parsed: jsonb("response_parsed"),
  error_message: text("error_message"),
  duration_ms: integer("duration_ms"),
  created_at: timestamp("created_at").defaultNow(),
});

export type ConflictAiEvent = typeof couplesConflictAiEvents.$inferSelect;

// ============ SHARED TO-DO LIST MODULE ============

// 35. SHARED TO-DOS - Tasks shared between couples and therapists
export const couplesSharedTodos = pgTable("Couples_shared_todos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: uuid("couple_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assigned_to: uuid("assigned_to"), // null = unassigned, user_id = assigned to specific person
  assigned_by: uuid("assigned_by").notNull(), // who created/assigned the task
  due_date: timestamp("due_date"),
  priority: text("priority").default("medium"), // 'low', 'medium', 'high'
  category: text("category"), // 'therapy', 'relationship', 'personal', 'household', etc.
  is_completed: boolean("is_completed").default(false),
  completed_by: uuid("completed_by"),
  completed_at: timestamp("completed_at"),
  is_therapist_assigned: boolean("is_therapist_assigned").default(false), // true if assigned by therapist
  therapist_notes: text("therapist_notes"), // private notes only visible to therapist
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertSharedTodoSchema = createInsertSchema(couplesSharedTodos).omit({
  id: true,
  created_at: true,
  updated_at: true,
  completed_at: true,
  completed_by: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.string().optional(),
});
export type InsertSharedTodo = z.infer<typeof insertSharedTodoSchema>;
export type SharedTodo = typeof couplesSharedTodos.$inferSelect;

// ============ LAYOUT TEMPLATES ============

// 36. LAYOUT TEMPLATES - Therapist-created dashboard layout templates
export const couplesLayoutTemplates = pgTable("Couples_layout_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  therapist_id: uuid("therapist_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  widget_order: jsonb("widget_order").notNull(),
  enabled_widgets: jsonb("enabled_widgets").notNull(),
  widget_sizes: jsonb("widget_sizes").notNull(),
  widget_content_overrides: jsonb("widget_content_overrides").default("{}"),
  is_shared: boolean("is_shared").default(false), // If true, template is available to other therapists
  usage_count: integer("usage_count").default(0), // How many times this template has been applied
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertLayoutTemplateSchema = createInsertSchema(couplesLayoutTemplates).omit({
  id: true,
  created_at: true,
  updated_at: true,
  usage_count: true,
}).extend({
  name: z.string().min(1, "Template name is required"),
  widget_order: z.array(z.string()),
  enabled_widgets: z.record(z.boolean()),
  widget_sizes: z.record(z.string()),
  widget_content_overrides: z.record(z.any()).optional(),
});
export type InsertLayoutTemplate = z.infer<typeof insertLayoutTemplateSchema>;
export type LayoutTemplate = typeof couplesLayoutTemplates.$inferSelect;
