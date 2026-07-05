# PLAN-07: Social Account Connection System

## Overview
Implement OAuth-based social account connections for Meta (Facebook/Instagram), TikTok, and Twitter with proper OAuth flows, token management, and account linking UI.

## Problem
Currently the Social Hub shows mock UI for connected channels. Users cannot actually connect their real social media accounts to the platform.

## Solution

### Phase 1: Backend - OAuth Endpoints

**1.1 Create OAuth Service** (`social-oauth.service.ts`)
- Implement OAuth 2.0 flow handlers for:
  - Meta (Facebook/Instagram) - `https://developers.facebook.com/`
  - TikTok - `https://developers.tiktok.com/`
  - Twitter/X - `https://developer.twitter.com/`
- Create authorization URL generators
- Implement token exchange handlers
- Add token refresh logic
- Store OAuth tokens securely in database

**1.2 Create OAuth Controller** (`social-oauth.controller.ts`)
Endpoints:
- `GET /oauth/meta/connect` - Initiate Meta OAuth
- `GET /oauth/meta/callback` - Handle Meta callback
- `GET /oauth/tiktok/connect` - Initiate TikTok OAuth
- `GET /oauth/tiktok/callback` - Handle TikTok callback
- `GET /oauth/twitter/connect` - Initiate Twitter OAuth
- `GET /oauth/twitter/callback` - Handle Twitter callback
- `DELETE /oauth/accounts/:accountId` - Disconnect account

**1.3 Update Database Schema**
- Add `oauthTokens` table:
  - `id`, `account_id`, `platform`, `access_token`, `refresh_token`, `expires_at`, `scope`, `user_id`
- Add `connectedPages` table for Meta:
  - `id`, `account_id`, `page_id`, `page_name`, `page_access_token`

### Phase 2: Frontend - Connection UI

**2.1 Create Connection Modal**
- Platform selection grid (Meta, TikTok, Twitter)
- Show connection status per platform
- "Connect" button redirects to OAuth flow
- "Disconnect" option for connected accounts

**2.2 Update Connected Channels Panel**
- Replace mock data with real connected accounts
- Show account details (username, page name, follower count)
- Add platform-specific icons and branding
- Implement loading states and error handling

**2.3 Add Account Switcher**
- For users with multiple pages per platform
- Dropdown to select which page to manage

### Phase 3: OAuth Redirect Handling

**3.1 Frontend OAuth Handler**
- Create `/oauth-callback` route
- Handle OAuth redirects from all platforms
- Show success/error states
- Auto-refresh page after successful connection

## Files to Create
- `apps/MVPLAB_BACKEND/src/modules/social-oauth/social-oauth.module.ts`
- `apps/MVPLAB_BACKEND/src/modules/social-oauth/social-oauth.service.ts`
- `apps/MVPLAB_BACKEND/src/modules/social-oauth/social-oauth.controller.ts`
- `apps/MyAppCEO/src/pages/OAuthCallbackPage.tsx`

## Files to Modify
- `apps/MVPLAB_BACKEND/src/app.module.ts` - Register module
- `apps/MVPLAB_BACKEND/src/database/schema.ts` - Add tables
- `apps/MyAppCEO/src/pages/SocialAutomationPage.tsx` - Update UI
- `apps/MyAppCEO/src/hooks/useSocialAutomation.ts` - Add connection methods

## Dependencies
- OAuth credentials for each platform (environment variables)
- Secure token storage

## Priority: HIGH
This is foundational - other features (video posting, scheduling) depend on connected accounts.