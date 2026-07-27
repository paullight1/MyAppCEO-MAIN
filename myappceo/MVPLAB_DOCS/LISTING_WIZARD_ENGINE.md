# Listing Wizard Engine

## Overview
Documents the 5-step guided process for sellers to list an app on the MVPLAB marketplace.

## 1. The 5-Step Process

### Step 1: Basic Information
- **Fields:** App Name, Tagline, Category, Tech Stack.
- **Validation:** Unique name check, character limits.

### Step 2: Assets & Media
- **Uploads:** App Icon (PNG/SVG), Screenshots (min 3), Demo Video (optional).
- **Requirement:** Alt text for accessibility.

### Step 3: Financials & Pricing
- **Type:** Fixed Price vs. Auction.
- **Fields:** Asking Price, Revenue Proof (upload/Stripe link).

### Step 4: Technical Specs
- **Details:** Repository access (GitHub link), Documentation URL, API requirements.
- **Compliance:** Terms of service agreement.

### Step 5: Review & Submit
- Summary of all entered data.
- Preview of how the listing will appear on the marketplace.

## 2. Technical Implementation
- **State Management:** Multi-step form with local storage persistence to prevent data loss.
- **Media Handling:** Direct-to-S3 uploads with progress bars.

## Implementation Notes
- Drafts are saved automatically after Step 1.
- Integration with MVPLAB_MODERATION system for automated initial checks.
