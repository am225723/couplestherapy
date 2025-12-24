import { supabase } from "@/lib/supabase";

export type WidgetSize = { cols: 1 | 2 | 3; rows: 1 | 2 };

export interface DashboardCustomization {
  couple_id: string;
  therapist_id?: string;
  widget_order: string[];
  enabled_widgets: Record<string, boolean>;
  widget_sizes?: Record<string, WidgetSize>;
  widget_content_overrides?: Record<string, any>;
}

export const invokeDashboardCustomization = async (
  coupleId: string,
  method: "GET" | "POST" | "PATCH",
  body?: any,
): Promise<DashboardCustomization> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    console.error("[Dashboard API] VITE_SUPABASE_URL is not configured");
    throw new Error("Supabase URL not configured");
  }

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    console.error(
      "[Dashboard API] No auth token available - user may not be logged in",
    );
    throw new Error("Not authenticated");
  }

  const url = `${supabaseUrl}/functions/v1/dashboard-customization?couple_id=${coupleId}`;

  console.log(`[Dashboard API] ${method} request to:`, url);
  if (body) {
    console.log("[Dashboard API] Request body:", JSON.stringify(body, null, 2));
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log("[Dashboard API] Response status:", response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "[Dashboard API] Error response:",
        response.status,
        responseText,
      );
      throw new Error(
        `${response.status}: ${responseText || "Failed to update dashboard"}`,
      );
    }

    try {
      const data = JSON.parse(responseText);
      console.log("[Dashboard API] Success response:", data);
      return data;
    } catch {
      console.error(
        "[Dashboard API] Failed to parse response as JSON:",
        responseText,
      );
      throw new Error("Invalid response from server");
    }
  } catch (error: any) {
    if (error.message?.includes(":")) {
      throw error;
    }
    console.error("[Dashboard API] Fetch error:", error.message, error);
    throw new Error(`Network error: ${error.message}`);
  }
};
