# Supabase Storage Setup for Voice Memos

## Overview

Voice memos are stored as audio files in a dedicated Supabase storage bucket with proper RLS policies to ensure privacy and security.

## Steps to Configure in Supabase Dashboard

### 1. Create Storage Bucket

1. Navigate to **Storage** section in Supabase Dashboard
2. Click **New bucket**
3. Set bucket name: `voice-memos`
4. Set **Public bucket**: `false` (private bucket for security)
5. Click **Create bucket**

### 2. Configure RLS Policies for Storage

Navigate to the newly created bucket's policies and add the following:

#### Policy 1: Allow couples to upload voice memos

```sql
CREATE POLICY "Couples can upload voice memos to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-memos'
  AND (storage.foldername(name))[1] IN (
    SELECT couple_id::text FROM public."Couples_profiles"
    WHERE id = auth.uid()
  )
);
```

#### Policy 2: Allow couples to read their voice memos

```sql
CREATE POLICY "Couples can read voice memos from their folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-memos'
  AND (storage.foldername(name))[1] IN (
    SELECT couple_id::text FROM public."Couples_profiles"
    WHERE id = auth.uid()
  )
);
```

#### Policy 3: Allow couples to delete their sent voice memos

```sql
CREATE POLICY "Couples can delete their sent voice memos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-memos'
  AND (storage.foldername(name))[1] IN (
    SELECT couple_id::text FROM public."Couples_profiles"
    WHERE id = auth.uid()
  )
);
```

## Bucket Structure

Voice memo files are organized by couple ID:

```
voice-memos/
  └── {couple_id}/
      ├── {memo_id_1}.webm
      ├── {memo_id_2}.webm
      └── {memo_id_3}.webm
```

**File naming convention:**

- Format: `{memo_id}.webm`
- Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm`

## Storage Path Reference

The `storage_path` field in the `Couples_voice_memos` table stores the relative path:

- Format: `{couple_id}/{memo_id}.webm`
- Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890/b2c3d4e5-f6a7-8901-bcde-f12345678901.webm`

## Audio Format

- **Recommended format:** WebM with Opus codec
- **File extension:** `.webm`
- **MIME type:** `audio/webm` or `audio/webm;codecs=opus`
- **Why WebM?**
  - Native browser support for recording
  - Excellent compression
  - Good quality at low bitrates
  - Cross-platform compatibility

## Security Notes

1. **Private bucket:** All voice memos are private by default
2. **RLS enforcement:** Only couple members can access their voice memos
3. **Therapist access:** Therapists can view metadata (database records) but NOT the audio files themselves
4. **Signed URLs:** Use Supabase signed URLs for temporary access when playing audio

## Next Steps

After configuring storage:

1. Verify bucket exists: `voice-memos`
2. Verify bucket is private (public: false)
3. Verify all three RLS policies are active
4. Test upload/download with authenticated users
