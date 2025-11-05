-- Supabase Storage Setup for Gratitude Log Images
-- Run this in your Supabase SQL Editor to create storage bucket and policies

-- Create a PRIVATE storage bucket for gratitude log images
-- Images will be accessed via signed URLs for security
INSERT INTO storage.buckets (id, name, public)
VALUES ('gratitude-images', 'gratitude-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gratitude-images bucket

-- Policy 1: Allow authenticated users to upload images ONLY to their own folder
CREATE POLICY "Couples can upload gratitude images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gratitude-images'
  AND (storage.foldername(name))[1] = get_my_couple_id()::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 2: Allow users to view images from their couple's folder
CREATE POLICY "Couples can view their gratitude images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'gratitude-images'
  AND (
    (storage.foldername(name))[1] = get_my_couple_id()::text
    -- Therapists can view images from their assigned couples
    OR EXISTS (
      SELECT 1 FROM public."Couples_couples"
      WHERE id::text = (storage.foldername(name))[1]
      AND therapist_id = auth.uid()
    )
  )
);

-- Policy 3: Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their own gratitude images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gratitude-images'
  AND (storage.foldername(name))[1] = get_my_couple_id()::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Allow users to update their own images (for replacements)
CREATE POLICY "Users can update their own gratitude images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gratitude-images'
  AND (storage.foldername(name))[1] = get_my_couple_id()::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

COMMENT ON COLUMN storage.objects.name IS 'File path structure: {couple_id}/{user_id}/{timestamp}_{filename}';
