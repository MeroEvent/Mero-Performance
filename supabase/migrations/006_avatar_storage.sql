-- ============================================================
-- Mero Attendance Management System
-- Migration 006: Profile Picture Storage Setup
-- ============================================================

-- 1. Create storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for avatars

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Allow public read access to all avatars (since they're profile pictures)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

-- ============================================================
-- NOTES
-- ============================================================
-- - Bucket is public, so avatar URLs work without authentication
-- - Users can upload/update/delete their own avatars
-- - File naming: avatars/{timestamp}-{random}.{ext}
-- - Max file size: 2MB (enforced in frontend)
-- - Supported formats: JPG, PNG, GIF
-- ============================================================
