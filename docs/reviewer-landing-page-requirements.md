# Reviewer Landing Page (Unified Dashboard) Requirements

## Overview
The reviewer landing page should combine current-week review submission and browsing past weeks' approved reviews into a single page so participants do not need to navigate to `/reviews`.

## Goals
- Keep the reviewer landing page at `/dashboard` as the primary entry point.
- Let participants review the current week and browse past weeks' reviews on the same page.
- Preserve review submission and editing behavior for the current week.
- Maintain review visibility rules (approved-only, locked until deadline).

## Non-Goals
- Changing review submission validation, moderation rules, or database schema.
- Redesigning curator/admin workflows or public-facing pages outside the reviewer flow.
- Introducing new analytics or social features beyond current review displays.

## Functional Requirements
- `/dashboard` remains the reviewer landing page and is available to authenticated participants.
- The page uses a single vertical scroll:
  - Current week review submission/editing appears first.
  - Past weeks appear below as expandable sections that show community reviews.
- The current week retains existing functionality:
  - Stats cards.
  - Current week review submission/editing.
- Previous weeks are read-only:
  - No edit/delete actions for closed weeks (anything that is not the current week).
  - Participant review cards are not editable or deletable.
- Past weeks mirror current `/reviews` behavior:
  - List past weeks in descending order.
  - Each week is expandable; expansion lazily loads reviews via `/api/reviews?week_number=`.
  - Cache loaded week data to avoid repeat fetches.
  - Show review counts and average ratings for each album.
- `/reviews` remains public and read-only.

## UX Requirements
- Current week appears first; past weeks follow in the same scroll.
- Past weeks are expandable and use existing album/review cards for consistency.
- If a week has no approved reviews, show an empty state inside the expanded section.

## Data and API
- Reuse `GET /api/my-reviews` for personal review data and stats.
- Use the weeks list from `GET /api/my-reviews` for dashboard rendering.
- Reuse `GET /api/reviews?week_number=` for approved review details.
- No new tables or migrations required.

## Decisions
- Past weeks are read-only (no edit/delete).
- Keep `/reviews` public as a read-only browse page.

## Testing Plan
- Unit
  - Expanding a week triggers exactly one fetch per week.
- Integration
  - `/dashboard` loads personal data and past-week browse data without blocking the current week.
  - `GET /api/reviews` errors are isolated to the browse view.
- E2E
  - Participant can submit/edit a review and then browse a previous week's reviews on the same page.
  - Past weeks show approved reviews only and do not expose edit/delete actions.
