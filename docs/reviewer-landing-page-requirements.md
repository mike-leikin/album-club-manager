# Reviewer Landing Page (Unified Dashboard) Requirements

## Overview
The reviewer landing page should combine current-week review submission and browsing past weeks' approved reviews into a single page so participants do not need to navigate to `/reviews`.

## Goals
- Keep the reviewer landing page at `/dashboard` as the primary entry point.
- Let participants review the current week and browse past weeks' reviews on the same page.
- Preserve existing review submission, editing, and deletion behavior.
- Maintain review visibility rules (approved-only, locked until deadline).

## Non-Goals
- Changing review submission validation, moderation rules, or database schema.
- Redesigning curator/admin workflows or public-facing pages outside the reviewer flow.
- Introducing new analytics or social features beyond current review displays.

## Functional Requirements
- `/dashboard` remains the reviewer landing page and is available to authenticated participants.
- The page provides two in-page views (names TBD, e.g., "My Reviews" and "Browse Reviews"):
  - A review view for the current week (and existing personal review history).
  - A browse view for past weeks' approved community reviews.
- Switching between views does not change routes and preserves any in-progress form state.
- The review view retains current functionality:
  - Stats cards.
  - Current week review submission/editing.
  - Previous weeks with the participant's own reviews and edit/delete actions.
- The browse view mirrors current `/reviews` behavior:
  - List all weeks in descending order.
  - Each week is expandable; expansion lazily loads reviews via `/api/reviews?week_number=`.
  - Cache loaded week data to avoid repeat fetches.
  - Show review counts and average ratings for each album.
- Weeks with a response deadline in the future are locked and not expandable.
- Loading and error states are scoped per view; failures in one view do not block the other.
- Replace the "Browse Reviews" header button with an in-page control (tab/segmented control/anchor) that does not navigate away from `/dashboard`.
- `/reviews` route behavior is clarified:
  - Option A: Keep `/reviews` as a public page and reuse the new browse components.
  - Option B: Redirect `/reviews` to `/dashboard` with a browse anchor.

## UX Requirements
- Default to the review view when the dashboard loads.
- The in-page view switch is clearly visible on desktop and mobile.
- The browse view indicates locked weeks with a clear label and disabled interaction.
- Expanded week sections use the existing album/review cards for consistency.

## Data and API
- Reuse `GET /api/my-reviews` for personal review data and stats.
- Reuse `GET /api/weeks?all=true` for the browse list.
- Reuse `GET /api/reviews?week_number=` for approved review details.
- No new tables or migrations required.

## Decisions
- Choose the in-page switch UI (tabs vs. stacked sections with anchors).
- Keep `/reviews` public as a read-only browse page.

## Testing Plan
- Unit
  - Browse view renders a locked state for weeks with future deadlines.
  - Expanding a week triggers exactly one fetch per week.
  - Switching views preserves in-progress form state.
- Integration
  - `/dashboard` loads both personal data and browse list without blocking each other.
  - `GET /api/reviews` errors are isolated to the browse view.
- E2E
  - Participant can submit/edit a review and then browse a previous week's reviews on the same page.
  - Locked current week reviews are not viewable in the browse section.
