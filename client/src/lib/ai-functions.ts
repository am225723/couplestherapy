import { supabase } from "./supabase";

// ========================================
// Types
// ========================================

export interface EmpathyPromptRequest {
  conversation_id: string;
  step_number: number;
  user_response: string;
}

export interface EmpathyPromptResponse {
  conversation_id: string;
  step_number: number;
  suggested_responses: string[];
  ai_full_response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EchoCoachingRequest {
  session_id: string;
  turn_id: string;
  speaker_message: string;
  listener_response: string;
}

export interface EchoCoachingResponse {
  session_id: string;
  turn_id: string;
  feedback: {
    what_went_well: string[];
    areas_to_improve: string[];
    suggested_response: string;
  };
  overall_score: number;
  ai_full_response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface VoiceMemoSentimentRequest {
  memo_id: string;
}

export interface VoiceMemoSentimentResponse {
  memo_id: string;
  tone: string;
  sentiment_score: number;
  whats_working: string[];
  gentle_suggestions: string[];
  encouragement: string;
  ai_full_response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ExerciseRecommendationsResponse {
  couple_id: string;
  generated_at: string;
  activity_summary: {
    not_started: string[];
    underutilized: string[];
    active: string[];
  };
  recommendations: Array<{
    tool_name: string;
    rationale: string;
    suggested_action: string;
  }>;
  ai_full_response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface SessionPrepResponse {
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
}

export interface AIInsightsResponse {
  couple_id: string;
  generated_at: string;
  summary: string;
  discrepancies: string[];
  patterns: string[];
  recommendations: string[];
  strengths: string[];
  raw_analysis: string;
  citations?: string[];
  data_sources: string[];
}

export interface CoupleAnalytics {
  couple_id: string;
  partner1_name: string;
  partner2_name: string;
  last_activity_date: string | null;
  engagement_score: number;
  checkin_completion_rate: number;
  gratitude_count: number;
  goals_completed: number;
  goals_total: number;
  conversations_count: number;
  rituals_count: number;
  total_checkins: number;
  checkins_this_month: number;
  avg_connectedness: number;
  avg_conflict: number;
}

export interface TherapistAnalyticsResponse {
  therapist_id: string;
  total_couples: number;
  active_couples: number;
  overall_checkin_rate: number;
  total_gratitude_logs: number;
  total_comments_given: number;
  couples: CoupleAnalytics[];
}

export interface TherapistThought {
  id: string;
  couple_id: string;
  therapist_id: string;
  thought_type: "todo" | "message" | "file_reference";
  title?: string;
  content: string;
  file_reference?: string;
  priority?: "low" | "medium" | "high";
  is_completed: boolean;
  individual_id?: string | null;
  created_at: string;
}

export interface TherapistThoughtInput {
  couple_id: string;
  thought_type: "todo" | "message" | "file_reference";
  title?: string;
  content: string;
  file_reference?: string;
  priority?: "low" | "medium" | "high";
  individual_id?: string | null;
}

export interface Message {
  id: string;
  couple_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    role: string;
  };
}

// ========================================
// Shared Invoke Helper
// ========================================

async function invokeFunction<T>(
  functionName: string,
  payload?: Record<string, any>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    // Enhanced error handling using status code when available
    const status = (error as any).status;

    if (
      status === 401 ||
      error.message?.includes("401") ||
      error.message?.includes("Unauthorized")
    ) {
      throw new Error("Session expired. Please log in again.");
    }
    if (
      status === 403 ||
      error.message?.includes("403") ||
      error.message?.includes("Forbidden")
    ) {
      throw new Error(
        "Access denied. You do not have permission to perform this action.",
      );
    }
    throw new Error(error.message || `Failed to call ${functionName}`);
  }

  return data as T;
}

// ========================================
// AI Function Helpers
// ========================================

export const aiFunctions = {
  /**
   * Get personalized exercise recommendations for a couple (Client access)
   */
  async getExerciseRecommendations(): Promise<ExerciseRecommendationsResponse> {
    return invokeFunction<ExerciseRecommendationsResponse>(
      "ai-exercise-recommendations",
    );
  },

  /**
   * Generate empathy prompts for Hold Me Tight conversations (Client access)
   */
  async createEmpathyPrompt(
    payload: EmpathyPromptRequest,
  ): Promise<EmpathyPromptResponse> {
    return invokeFunction<EmpathyPromptResponse>("ai-empathy-prompt", payload);
  },

  /**
   * Get active listening coaching feedback (Client access)
   */
  async createEchoCoaching(
    payload: EchoCoachingRequest,
  ): Promise<EchoCoachingResponse> {
    return invokeFunction<EchoCoachingResponse>("ai-echo-coaching", payload);
  },

  /**
   * Analyze voice memo sentiment (Client access)
   */
  async analyzeVoiceMemoSentiment(
    payload: VoiceMemoSentimentRequest,
  ): Promise<VoiceMemoSentimentResponse> {
    return invokeFunction<VoiceMemoSentimentResponse>(
      "ai-voice-memo-sentiment",
      payload,
    );
  },

  /**
   * Generate therapist session preparation summary (Therapist-only)
   * @param coupleId - The couple ID to generate session prep for
   */
  async getSessionPrep(coupleId: string): Promise<SessionPrepResponse> {
    return invokeFunction<SessionPrepResponse>("ai-session-prep", {
      couple_id: coupleId,
    });
  },

  /**
   * Get AI insights for a couple's check-in data (Therapist-only)
   * @param coupleId - The couple ID to get insights for
   */
  async getAIInsights(coupleId: string): Promise<AIInsightsResponse> {
    return invokeFunction<AIInsightsResponse>("ai-insights", {
      couple_id: coupleId,
    });
  },

  /**
   * Get therapist analytics for all couples (Therapist-only, cross-therapist access)
   */
  async getTherapistAnalytics(): Promise<TherapistAnalyticsResponse> {
    return invokeFunction<TherapistAnalyticsResponse>("therapist-analytics");
  },

  /**
   * Get therapist thoughts for a couple (Therapist-only, cross-therapist access)
   * @param coupleId - The couple ID to get thoughts for
   */
  async getTherapistThoughts(coupleId: string): Promise<TherapistThought[]> {
    return invokeFunction<TherapistThought[]>("therapist-thoughts", {
      couple_id: coupleId,
    });
  },

  /**
   * Create a therapist thought for a couple (Therapist-only, cross-therapist access)
   * @param input - The thought input data
   */
  async createTherapistThought(
    input: TherapistThoughtInput,
  ): Promise<TherapistThought> {
    return invokeFunction<TherapistThought>("therapist-thoughts", input);
  },

  /**
   * Update a therapist thought (Therapist-only, only own thoughts)
   * @param thoughtId - The thought ID to update
   * @param updates - The fields to update
   */
  async updateTherapistThought(
    thoughtId: string,
    updates: Partial<TherapistThoughtInput & { is_completed: boolean }>,
  ): Promise<TherapistThought> {
    return invokeFunction<TherapistThought>("therapist-thoughts", {
      thought_id: thoughtId,
      ...updates,
    });
  },

  /**
   * Delete a therapist thought (Therapist-only, only own thoughts)
   * @param thoughtId - The thought ID to delete
   */
  async deleteTherapistThought(thoughtId: string): Promise<{ success: boolean }> {
    return invokeFunction<{ success: boolean }>("therapist-thoughts", {
      thought_id: thoughtId,
    });
  },

  /**
   * Get messages for a couple (Therapist-only, cross-therapist access)
   * @param coupleId - The couple ID to get messages for
   */
  async getMessages(coupleId: string): Promise<Message[]> {
    return invokeFunction<Message[]>("therapist-messages", {
      couple_id: coupleId,
    });
  },

  /**
   * Send a message to a couple (Therapist-only, cross-therapist access)
   * @param coupleId - The couple ID to send message to
   * @param messageText - The message content
   */
  async sendMessage(coupleId: string, messageText: string): Promise<Message> {
    return invokeFunction<Message>("therapist-messages", {
      couple_id: coupleId,
      message_text: messageText,
    });
  },

  /**
   * Mark a message as read (Therapist-only, cross-therapist access)
   * @param messageId - The message ID to mark as read
   */
  async markMessageRead(messageId: string): Promise<{ success: boolean }> {
    return invokeFunction<{ success: boolean }>("therapist-messages", {
      message_id: messageId,
    });
  },
};
