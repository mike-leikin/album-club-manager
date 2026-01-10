# Review Confirmation Email Implementation Plan

## Phase 1: Decisions and content design
- Decide confirmation policy: send to unsubscribed participants or only subscribed.
- Confirm whether review text is included in full or truncated.
- Choose the edit/view link destination (`/dashboard`, `/submit`, or both).
- Define subject format and section layout.

## Phase 2: Email template
- Add a new email builder function for review confirmations.
- Render both HTML and text versions with the submitted review data.
- Escape user-generated content in HTML.
- Add unit tests for template rendering and escaping.

## Phase 3: API integration
- Update `app/api/reviews/submit/route.ts` to load week details and participant info for the email.
- After successful insert, call a send utility that uses Resend.
- Ensure email failures do not change the review submission response.
- Add logging and Sentry capture for send errors.

## Phase 4: Logging and audit trail
- Choose logging strategy:
  - Option A: create `email_sends` record (email_type: `review_confirmation`) and `email_send_recipients`.
  - Option B: log to `email_logs` only.
- Store provider message IDs and error details.

## Phase 5: UI copy updates
- Update success toasts in `app/submit/page.tsx` and `app/dashboard/page.tsx` to mention the confirmation email.

## Phase 6: Tests and validation
- Extend `tests/unit/api/reviews/submit.test.ts` to assert that email sending is triggered.
- Add failure-path tests that verify submission succeeds when the email send fails.

## Phase 7: Documentation
- Add a short note in `EMAIL_SETUP.md` about review confirmation emails being transactional.
- Optionally add a note in `README.md` or `CHANGELOG.md`.
