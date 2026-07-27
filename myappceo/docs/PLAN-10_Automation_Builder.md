# PLAN-10: Enhanced Automation Builder (ManyChat-Style)

## Overview
Transform the current basic automation rules into a visual drag-and-drop automation builder similar to ManyChat, with triggers, conditions, and actions.

## Problem
Current automations are limited to simple keyword triggers. Users need complex automation flows with multiple conditions, actions, and branching logic.

## Solution

### Phase 1: Backend - Automation Engine

**1.1 Create Automation Engine Service** (`automation-engine.service.ts`)
- Parse and execute automation flows
- Handle trigger evaluation
- Process conditions and branching
- Execute actions (send message, tag user, etc.)
- Track automation analytics

**1.2 Update Automation Controller**
- `POST /automations` - Create new automation
- `GET /automations` - List automations
- `GET /automations/:id` - Get automation details
- `PUT /automations/:id` - Update automation
- `DELETE /automations/:id` - Delete automation
- `POST /automations/:id/publish` - Activate automation
- `POST /automations/:id/test` - Test automation

**1.3 Create Webhook Handler**
- Receive inbound messages from platforms
- Match against active automations
- Execute appropriate flows

### Phase 2: Automation Flow Builder (Frontend)

**2.1 Create Flow Builder Component**
- Canvas-based drag-and-drop editor
- Node types:
  - **Triggers**: Keyword, New Follower, DM Received, Mention, Hashtag
  - **Conditions**: If/Else, Check User Tag, Check Attribute, Random Split
  - **Actions**: Send Message, Send Media, Add Tag, Remove Tag, Create Task, HTTP Request
  - **Delays**: Wait, Wait Until Time
- Connectors between nodes
- Zoom and pan controls
- Undo/redo functionality

**2.2 Create Node Palette**
- Sidebar with draggable node types
- Node search
- Recently used nodes

**2.3 Create Node Properties Panel**
- Dynamic form based on selected node
- Rich text editor for messages
- Media picker integration
- Variable insertions ({{user.name}}, etc.)

### Phase 3: Automation Features

**3.1 User Tagging System**
- Create custom tags
- Add/remove tags based on automation
- Filter users by tags
- Use tags in conditions

**3.2 User Attributes**
- Store custom user attributes
- Use in conditions and personalization
- Track automation interactions

**3.3 Analytics & Reporting**
- Automation trigger counts
- Conversion rates per automation
- Flow drop-off points
- A/B testing support

### Phase 4: Integration with Connected Accounts

**4.1 Multi-Platform Support**
- Same automation can run on multiple platforms
- Platform-specific message formatting
- Platform capabilities detection

**4.2 Message Templates**
- Save reusable message templates
- Use in multiple automations
- Template variables

## Files to Create
- `apps/MVPLAB_BACKEND/src/modules/automation/automation.module.ts`
- `apps/MVPLAB_BACKEND/src/modules/automation/automation.service.ts`
- `apps/MVPLAB_BACKEND/src/modules/automation/automation.controller.ts`
- `apps/MVPLAB_BACKEND/src/modules/automation/automation.engine.ts`
- `apps/MVPLAB_BACKEND/src/modules/automation/webhook.handler.ts`
- `apps/MyAppCEO/src/components/AutomationBuilder/FlowCanvas.tsx`
- `apps/MyAppCEO/src/components/AutomationBuilder/NodePalette.tsx`
- `apps/MyAppCEO/src/components/AutomationBuilder/PropertiesPanel.tsx`
- `apps/MyAppCEO/src/pages/AutomationBuilderPage.tsx`

## Files to Modify
- `apps/MVPLAB_BACKEND/src/app.module.ts`
- `apps/MVPLAB_BACKEND/src/database/schema.ts` - Update `automationRules` to `automations`
- `apps/MyAppCEO/src/pages/SocialAutomationPage.tsx`
- `apps/MyAppCEO/src/hooks/useSocialAutomation.ts`
- `apps/MyAppCEO/src/App.tsx`

## Database Schema Changes
```sql
-- Replace automationRules with more flexible schema
CREATE TABLE automations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  flow_data JSONB NOT NULL, -- Visual flow structure
  status TEXT DEFAULT 'draft', -- draft, active, paused
  triggers JSONB,
  actions JSONB,
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_tags (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  tags TEXT[], -- Array of tag names
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Dependencies
- React Flow or similar for canvas
- Zustand or Redux for state management
- Rich text editor (TipTap or Slate)

## Priority: MEDIUM
Core automation feature, but can be phased after basic posting.

## Notes
- Keep existing automation functionality working during migration
- Support import/export of automation flows
- Provide pre-built automation templates