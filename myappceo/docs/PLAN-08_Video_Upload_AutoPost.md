# PLAN-08: Video Upload & Auto-Posting System

## Overview
Implement video upload functionality that automatically posts uploaded videos to connected social media accounts (Instagram Reels, TikTok, YouTube Shorts, Twitter/X).

## Problem
Users need to upload videos once and have them automatically posted to all their connected accounts without manual copy-pasting.

## Solution

### Phase 1: Backend - Video Upload API

**1.1 Create Upload Service** (`video-post.service.ts`)
- Handle multipart file uploads
- Validate video format (MP4, MOV, AVI)
- Validate video duration (short-form: <60s for Reels/TikTok, <3min for YouTube)
- Generate video metadata (duration, resolution, thumbnail)
- Integrate with platform APIs for posting

**1.2 Create Upload Controller** (`video-post.controller.ts`)
Endpoints:
- `POST /video/upload` - Upload video file
- `GET /video/:videoId/status` - Check upload/posting status
- `GET /video/list` - List user's uploaded videos
- `DELETE /video/:videoId` - Delete video

**1.3 Platform Posting Integration**
- Instagram Graph API - Post to Feed/Reels
- TikTok API - Upload video to TikTok
- Twitter API v2 - Post tweet with video
- YouTube Data API - Upload as Short

### Phase 2: Frontend - Upload Interface

**2.1 Create Video Upload Modal**
- Drag-and-drop zone with video preview
- Upload progress indicator
- Platform selection checkboxes (which accounts to post to)
- Caption/description input
- Hashtag suggestions
- Thumbnail selection

**2.2 Create Video Library Page**
- Grid view of uploaded videos
- Status indicators (uploading, posted, failed)
- Edit caption functionality
- Delete/repost options
- Performance metrics per video

**2.3 Integrate into Social Hub**
- Add "Upload Video" button in header
- Show recent uploads in sidebar
- Quick-access to video library

### Phase 3: Auto-Posting Logic

**3.1 Posting Queue**
- Queue system for multiple platform posts
- Retry logic for failed posts
- Rate limiting per platform

**3.2 Status Tracking**
- Real-time status updates via polling
- Error messages for failed posts
- Partial success handling (some platforms work, others fail)

**3.3 Notifications**
- Toast notifications on post success/failure
- Email notifications for critical failures

## Files to Create
- `apps/MVPLAB_BACKEND/src/modules/video-post/video-post.module.ts`
- `apps/MVPLAB_BACKEND/src/modules/video-post/video-post.service.ts`
- `apps/MVPLAB_BACKEND/src/modules/video-post/video-post.controller.ts`
- `apps/MyAppCEO/src/components/VideoUploadModal.tsx`
- `apps/MyAppCEO/src/pages/VideoLibraryPage.tsx`

## Files to Modify
- `apps/MVPLAB_BACKEND/src/app.module.ts`
- `apps/MVPLAB_BACKEND/src/database/schema.ts` - Add `videos` table
- `apps/MyAppCEO/src/pages/SocialAutomationPage.tsx`
- `apps/MyAppCEO/src/App.tsx` - Add route

## Database Schema Addition
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  caption TEXT,
  platforms TEXT[], -- ['instagram', 'tiktok', 'twitter', 'youtube']
  status TEXT, -- 'uploading', 'processing', 'posted', 'failed'
  platform_posts JSONB, -- { instagram: { post_id, url, status }, ... }
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Dependencies
- File storage (S3, Cloudflare R2, or Supabase Storage)
- Platform API credentials
- Video processing (FFmpeg for thumbnails)

## Priority: HIGH
Core feature for Social Hub - enables content distribution.