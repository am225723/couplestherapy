# Gratitude Log Image Upload Feature

## Overview
The gratitude log now supports uploading images alongside text entries, allowing couples to share visual moments of appreciation and connection.

## What's New

### 1. Image Upload Capability
- **Upload Button**: Easy-to-use "Add Image" button in the gratitude form
- **Image Preview**: See uploaded image before posting
- **File Validation**: Automatic validation of file type and size
- **Size Limit**: Maximum 5MB per image
- **Supported Formats**: All standard image formats (JPEG, PNG, GIF, WebP, etc.)

### 2. Supabase Storage Integration
- **Secure Storage**: Images stored in **PRIVATE** Supabase Storage bucket with strict RLS policies
- **Organized Structure**: Files organized by couple_id/user_id/timestamp_filename
- **Signed URLs**: Images accessible only via time-limited signed URLs (1 hour expiry)
- **Automatic Cleanup**: Failed uploads are automatically deleted to prevent orphaned files
- **Strict Upload Control**: Users can only upload to their own folder (couple_id + user_id enforced)

### 3. Enhanced Feed Display
- **Image Display**: Images shown at full width within gratitude cards
- **Text Optional**: Can post image-only gratitude entries
- **Combined Posts**: Support for both text and image in same entry
- **Responsive Design**: Images display beautifully on all screen sizes

## Setup Instructions

### Step 1: Run the Storage Setup Script

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/froxodstewdswllgokmu
2. Click **"SQL Editor"** → **"New query"**
3. Copy and paste the contents of `supabase-storage-setup.sql`
4. Click **"Run"**

This script will:
- Create the `gratitude-images` storage bucket (**PRIVATE** access)
- Set up strict RLS policies for secure upload/view/delete
- Configure folder structure for organized storage
- Enforce user-id level access control for uploads

### Step 2: Verify Bucket Creation

1. In Supabase Dashboard, go to **Storage**
2. You should see a bucket named **"gratitude-images"**
3. The bucket should be marked as **Private** (not public)

### Step 3: Test the Feature

1. Log in as a couple member
2. Navigate to **Gratitude Log**
3. Click **"Add Image"** button
4. Select an image from your device
5. Optionally add text
6. Click **"Share Gratitude"**
7. Image should upload and display in the feed

## Technical Details

### Storage Structure
```
gratitude-images/
  └── {couple_id}/
      └── {user_id}/
          └── {timestamp}_{filename}
```

### RLS Policies

**Upload Policy**: Users can upload ONLY to their own folder (couple_id + user_id)
```sql
bucket_id = 'gratitude-images'
AND (storage.foldername(name))[1] = get_my_couple_id()::text
AND (storage.foldername(name))[2] = auth.uid()::text
```

**View Policy**: Users and therapists can view couple's images
```sql
bucket_id = 'gratitude-images'
AND (
  (storage.foldername(name))[1] = get_my_couple_id()::text
  OR therapist_id = auth.uid()
)
```

**Delete Policy**: Users can only delete their own uploads
```sql
bucket_id = 'gratitude-images'
AND (storage.foldername(name))[1] = get_my_couple_id()::text
AND (storage.foldername(name))[2] = auth.uid()::text
```

### Frontend Implementation

**Image Upload Component** (gratitude-log.tsx):
- File input with validation
- Preview before upload
- Progress indicators (uploading/posting states)
- Error handling for upload failures
- Remove image button for changing selection

**Schema Validation**:
- Text content is optional
- Image URL is optional
- At least one (text OR image) must be provided
- Image URLs must be valid URLs

### File Validation

**Client-Side Validation**:
1. File type must start with "image/"
2. File size must be ≤ 5MB
3. Clear error messages for invalid files

**Upload Process**:
1. Validate file on client (type and size)
2. Generate unique filename with timestamp
3. Upload to Supabase Storage (private bucket)
4. Store file path in database
5. Insert gratitude log with file path
6. If insert fails, automatically delete uploaded file
7. On display, generate signed URL (1-hour expiry)
8. Display in feed with signed URL

## User Experience

### For Couples

1. **Easy Upload**: Single click to add images
2. **Visual Preview**: See image before posting
3. **Flexible Posts**: Post text, image, or both
4. **Beautiful Display**: Images shown prominently in feed
5. **Quick Sharing**: Share meaningful moments instantly

### For Therapists

- View couple's visual gratitude expressions
- Images provide additional context for therapy
- Can comment on image-based posts
- Images visible in couple dashboard

## Benefits

1. **Visual Expression**: Pictures capture moments words can't describe
2. **Emotional Connection**: Sharing photos deepens intimacy
3. **Memory Preservation**: Create a visual timeline of gratitude
4. **Engagement**: Images make the gratitude log more engaging
5. **Therapeutic Value**: Visual evidence of positive moments

## Security & Privacy

✅ **Private Bucket**: Images stored in private bucket, NOT accessible by URL guessing
✅ **Signed URLs**: Images accessed via time-limited signed URLs (1 hour expiry)
✅ **Strict Upload RLS**: Users can ONLY upload to their own folder (couple_id + user_id enforced)
✅ **RLS Enforcement**: Only couples and assigned therapists can view images
✅ **Organized Storage**: Files separated by couple and user IDs
✅ **Delete Control**: Users can only delete their own uploads
✅ **Orphan Prevention**: Failed uploads are automatically cleaned up
✅ **File Validation**: Client-side validation (type + size) prevents abuse

## Limitations & Considerations

- **File Size**: 5MB max per image (prevents storage bloat)
- **Formats**: Standard image formats only
- **Storage Costs**: Consider Supabase storage limits on free tier
- **No Editing**: Images cannot be edited after upload (only delete/re-upload)
- **Signed URL Expiry**: URLs expire after 1 hour, requiring regeneration
- **Performance**: Signed URL generation adds small latency to feed loading

## Future Enhancements

Potential improvements:
- Image compression before upload
- Multiple images per post
- Image galleries/carousels
- Image editing tools (crop, rotate, filters)
- Video support
- Automatic thumbnail generation
- Image analysis for insights (AI-powered)

---

**Status**: ✅ Complete and ready for production
**Database Update Required**: Yes - run `supabase-storage-setup.sql`
**Dependencies**: Supabase Storage, RLS policies
