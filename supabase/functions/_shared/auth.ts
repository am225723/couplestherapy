import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface TherapistAuthResult {
  success: true;
  therapistId: string;
  email: string;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

export type AuthResult = TherapistAuthResult | AuthError;

export async function verifyTherapistAuth(req: Request): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      success: false,
      error: "Server configuration error",
      status: 500,
    };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "No authorization token provided",
      status: 401,
    };
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      success: false,
      error: "Invalid or expired session",
      status: 401,
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("Couples_profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: "User profile not found",
      status: 403,
    };
  }

  if (profile.role !== "therapist") {
    return {
      success: false,
      error: "Access denied. Therapist role required.",
      status: 403,
    };
  }

  return {
    success: true,
    therapistId: profile.id,
    email: profile.email || user.email || "",
  };
}

export async function verifyCoupleExists(coupleId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: couple, error } = await supabaseAdmin
    .from("Couples_couples")
    .select("id")
    .eq("id", coupleId)
    .single();

  return !error && !!couple;
}
