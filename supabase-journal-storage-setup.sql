-- ============================================
-- JOURNAL ATTACHMENTS STORAGE SETUP
-- ============================================
-- Creates private storage bucket for journal media attachments
-- Run this in Supabase SQL Editor after main migration
-- ============================================

-- Create a PRIVATE storage bucket for journal attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-attachments', 'journal-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES FOR JOURNAL ATTACHMENTS
-- ============================================

-- Policy 1: Allow authenticated users to upload attachments ONLY to their own couple's folder
CREATE POLICY "Couples can upload journal attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-attachments'
  AND (storage.foldername(name))[1] = get_my_couple_id()::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 2: Allow users to view attachments from their couple's folder
-- This respects journal entry visibility rules (private, shared_with_partner, shared_with_therapist)
CREATE POLICY "Couples can view their journal attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-attachments'
  AND (
    -- User can see their own uploads
    (storage.foldername(name))[2] = auth.uid()::text
    -- OR user is part of the couple and entry is shared
    OR (
      (storage.foldername(name))[1] = get_my_couple_id()::text
      -- Additional check: verify the attachment's entry is actually shared
      AND EXISTS (
        SELECT 1 FROM public."Couples_journal_attachments" ja
        JOIN public."Couples_journal_entries" je ON ja.entry_id = je.id
        WHERE ja.file_path = name
        AND je.visibility IN ('shared_with_partner', 'shared_with_therapist')
      )
    )
    -- OR therapist can view attachments from their assigned couples
    OR EXISTS (
      SELECT 1 FROM public."Couples_couples"
      WHERE id::text = (storage.foldername(name))[1]
      AND therapist_id = auth.uid()
      -- Additional check: verify entry is shared with therapist
      AND EXISTS (
        SELECT 1 FROM public."Couples_journal_attachments" ja
        JOIN public."Couples_journal_entries" je ON ja.entry_id = je.id
        WHERE ja.file_path = name
        AND je.visibility = 'shared_with_therapist'
      )
    )
  )
);

-- Policy 3: Allow users to delete their own uploaded attachments
CREATE POLICY "Users can delete their own journal attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-attachments'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Allow users to update their own uploaded attachments (e.g., replace a file)
CREATE POLICY "Users can update their own journal attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-attachments'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'journal-attachments'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
