# Reviewer Landing Page (Unified Dashboard) Implementation Plan

## Phase 1: Confirm UX and routing decisions
- Choose the in-page switch (tabs, segmented control, or anchor-based sections).
- Keep `/reviews` public (reusing browse components).
- Confirm default view on load and how view state is preserved across toggles.

## Phase 2: Extract reusable browse components
- Move the existing browse UI from `app/reviews/page.tsx` into shared components (e.g., `components/reviews/`).
- Include the week list, expandable week section, album review block, and review card.
- Add a small hook or helper to manage week expansion state and lazy-loading.

## Phase 3: Integrate browse view into `/dashboard`
- Add browse state and data fetching alongside the existing `loadReviews()` call.
- Fetch `/api/weeks?all=true` for the browse list.
- Trigger `/api/reviews?week_number=` on expansion and cache results per week.
- Keep browse loading and error state isolated from personal review state.

## Phase 4: Update dashboard layout and navigation
- Add the in-page switcher in the dashboard header or main content.
- Replace the "Browse Reviews" button with a switch or anchor to the browse view.
- Ensure mobile layout keeps the switch visible and avoids long scroll jumps.

## Phase 5: Reconcile `/reviews` route
- Option A: Update `app/reviews/page.tsx` to reuse the extracted browse components.
- Option B: Redirect `/reviews` to `/dashboard` with a browse anchor or query flag.
- Verify public access expectations if `/reviews` remains public.

## Phase 6: Documentation and tests
- Update `PARTICIPANT_DASHBOARD.md` to reflect the unified reviewer experience.
- Add or update tests for view switching and browse expansion caching.
- Validate loading/error states for both views.
