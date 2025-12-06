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
};
