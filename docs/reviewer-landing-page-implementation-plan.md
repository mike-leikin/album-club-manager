# Reviewer Landing Page (Unified Dashboard) Implementation Plan

## Phase 1: Confirm UX and routing decisions
- Confirm vertical scroll layout (current week first, past weeks below).
- Keep `/reviews` public (reusing browse components).
- Confirm closed-week behavior (no edit/delete for non-current weeks).

## Phase 2: Extract reusable browse components
- Move the existing browse UI from `app/reviews/page.tsx` into shared components (e.g., `components/reviews/`).
- Include the week list, expandable week section, album review block, and review card.
- Add a small hook or helper to manage week expansion state and lazy-loading.

## Phase 3: Integrate browse view into `/dashboard`
- Add browse state and data fetching alongside the existing `loadReviews()` call.
- Use the weeks list from `/api/my-reviews` to render past weeks on the dashboard.
- Trigger `/api/reviews?week_number=` on expansion and cache results per week.
- Keep browse loading and error state isolated from current-week review state.
- Remove edit/delete actions for non-current weeks.

## Phase 4: Update dashboard layout and navigation
- Replace the "Browse Reviews" button with inline past-week sections.
- Ensure the past-week list is expandable and scroll-friendly on mobile.

## Phase 5: Reconcile `/reviews` route
- Option A: Update `app/reviews/page.tsx` to reuse the extracted browse components.
- Option B: Redirect `/reviews` to `/dashboard` with a browse anchor or query flag.
- Verify public access expectations if `/reviews` remains public.

## Phase 6: Documentation and tests
- Update `PARTICIPANT_DASHBOARD.md` to reflect the unified reviewer experience.
- Add or update tests for browse expansion caching and closed-week read-only behavior.
- Validate loading/error states for the current week and past-week sections.
