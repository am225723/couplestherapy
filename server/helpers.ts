import type { Request } from "express";
import { supabaseAdmin } from "./supabase.js";

// Helper function to extract access token from request (Authorization header or cookies)
export function getAccessToken(req: Request): string | null {
  // First, try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookies
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const cookieArray = cookies.split(';');
  for (const cookie of cookieArray) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sb-access-token' || name.includes('access-token')) {
      return value;
    }
  }
  return null;
}

// Helper function to verify session and check if user is a therapist
export async function verifyTherapistSession(req: Request): Promise<{ success: false; error: string; status: number } | { success: true; therapistId: string }> {
  const accessToken = getAccessToken(req);

  if (!accessToken) {
    return {
      success: false,
      error: 'No session found. Please log in.',
      status: 401
    };
  }

  // Verify the access token with Supabase
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    console.error('Therapist session verification failed:', authError?.message);
    return {
      success: false,
      error: 'Invalid or expired session. Please log in again.',
      status: 401
    };
  }

  // Verify user has therapist role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('Couples_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: 'User profile not found.',
      status: 403
    };
  }

  if (profile.role !== 'therapist') {
    return {
      success: false,
      error: 'Access denied. Only therapists can perform this action.',
      status: 403
    };
  }

  return {
    success: true,
    therapistId: user.id
  };
}

// Helper function to verify session for regular client users
export async function verifyUserSession(req: Request): Promise<{ success: false; error: string; status: number } | { success: true; userId: string; coupleId: string; partnerId: string }> {
  const accessToken = getAccessToken(req);

  if (!accessToken) {
    return {
      success: false,
      error: 'No session found. Please log in.',
      status: 401
    };
  }

  // Verify the access token with Supabase
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    console.error('User session verification failed:', authError?.message);
    return {
      success: false,
      error: 'Invalid or expired session. Please log in again.',
      status: 401
    };
  }

  // Get user profile and couple information
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('Couples_profiles')
    .select('role, couple_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: 'User profile not found.',
      status: 403
    };
  }

  if (!profile.couple_id) {
    return {
      success: false,
      error: 'User is not part of a couple.',
      status: 403
    };
  }

  // Get couple details to find partner
  const { data: couple, error: coupleError } = await supabaseAdmin
    .from('Couples_couples')
    .select('partner1_id, partner2_id')
    .eq('id', profile.couple_id)
    .single();

  if (coupleError || !couple) {
    return {
      success: false,
      error: 'Couple not found.',
      status: 404
    };
  }

  // Determine partner ID
  const partnerId = couple.partner1_id === user.id ? couple.partner2_id : couple.partner1_id;

  return {
    success: true,
    userId: user.id,
    coupleId: profile.couple_id,
    partnerId: partnerId
  };
}
