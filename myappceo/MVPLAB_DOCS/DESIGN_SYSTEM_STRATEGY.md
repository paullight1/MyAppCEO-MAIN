# Design System Strategy

## Overview
Visual guidelines for charts, dark mode, and interactive components to ensure consistency across the marketplace.

## 1. Visual Theme (CEO Dashboard)
- **Primary Color:** Deep Slate (#1A202C).
- **Accent Color:** Electric Blue (#3182CE).
- **Success/Warning:** Emerald (#48BB78) / Amber (#ECC94B).

## 2. Dark Mode Implementation
- **Strategy:** Tailwind CSS `dark` class utility.
- **Backgrounds:** Dark Slate (#171923) for main surfaces; Slate-800 for cards.
- **Contrast:** Ensure AA accessibility standards for all text elements.

## 3. Charts & Data Viz
- **Palette:** Consistent color mapping (e.g., Revenue is always Green).
- **Interactivity:** Tooltips on hover; click-to-zoom for time-series data.
- **Empty States:** Custom illustrations for "No Data" scenarios.

## 4. Interactive Components
- **Buttons:** Subtle micro-interactions on hover/active states.
- **Modals:** Slide-in transitions; backdrop blur.
- **Loading:** Skeleton screens for initial page loads.

## Implementation Notes
- Component library built using React and Tailwind.
- Design tokens stored in `tailwind.config.js`.
