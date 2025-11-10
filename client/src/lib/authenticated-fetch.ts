import { supabase } from './supabase';

export interface AuthenticatedFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Centralized authenticated fetch helper that handles:
 * - Supabase session refresh
 * - Authorization header injection
 * - Credential inclusion
 * - JSON convenience handling
 * 
 * Use this instead of raw fetch() for all authenticated API calls.
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  // Get Supabase session
  let { data: { session } } = await supabase.auth.getSession();
  
  // If no session, try refreshing (this handles expired sessions)
  // If there's no refresh token, refreshSession will fail silently
  // and we'll proceed without auth, letting the server return 401
  if (!session) {
    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
    session = refreshedSession;
  }
  
  // Build headers with Authorization if we have a session
  const headers: Record<string, string> = {
    ...options.headers,
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  // Make the fetch call with credentials
  // If no session, proceed without auth header and let server return 401
  // which existing error handlers (getQueryFn's returnNull, etc.) can handle
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * Convenience helper for authenticated fetch that automatically parses JSON response
 * and throws on non-OK status
 */
export async function authenticatedFetchJson<T>(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<T> {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }
  
  return response.json();
}
