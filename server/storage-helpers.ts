import { supabaseAdmin } from './supabase.js';

/**
 * Generate a signed upload URL for a new voice memo
 * @param coupleId - The couple's ID for organizing storage
 * @param memoId - The voice memo's unique ID
 * @returns Upload URL and token, or error
 */
export async function generateVoiceMemoUploadUrl(coupleId: string, memoId: string) {
  const path = `${coupleId}/${memoId}.webm`;
  const { data, error } = await supabaseAdmin.storage
    .from('voice-memos')
    .createSignedUploadUrl(path);
  
  return { data, error, path };
}

/**
 * Generate a signed download URL for playback
 * @param storagePath - The full storage path of the voice memo
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns Signed URL or error
 */
export async function generateVoiceMemoDownloadUrl(storagePath: string, expiresIn: number = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from('voice-memos')
    .createSignedUrl(storagePath, expiresIn);
  
  return { data, error };
}

/**
 * Delete a voice memo from storage
 * @param storagePath - The full storage path of the voice memo to delete
 * @returns Success status or error
 */
export async function deleteVoiceMemo(storagePath: string) {
  const { data, error } = await supabaseAdmin.storage
    .from('voice-memos')
    .remove([storagePath]);
  
  return { data, error };
}
