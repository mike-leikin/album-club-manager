# Review Submission Confirmation Email

## Overview
Participants receive a confirmation email that includes the review details they just submitted.

## Goals
- Confirm receipt of submitted reviews.
- Provide a copy of ratings and review text.
- Provide a link to view or edit the review.

## Non-Goals
- Changing the review submission flow or validation rules.
- Sending admin notifications or moderation updates.
- Replacing weekly emails or email history UI.

## Functional Requirements
- Trigger: send after a successful `POST /api/reviews/submit` insert.
- Recipient: `participant_email` from the submission (normalized), sent regardless of subscription status.
- Email content:
  - Subject uses week label (date).
  - Greeting uses participant name (existing record or derived).
  - Include sections for each submitted album (contemporary and/or classic).
  - Each section includes title, artist, year, rating, favorite track (if present), and review text (if present).
  - Include review text in full; if missing, omit the block or show "No review text submitted".
  - Mention moderation status and clarify the submitter can view their review in the dashboard regardless of status.
  - Include a link to view or edit reviews at `/dashboard`.
- Provide HTML and plain text versions.
- Escape user-provided fields in HTML (review_text, favorite_track, name).
- Email send failures do not block the API response; log the failure.

## UX Requirements
- On successful submit, the UI indicates that a confirmation email was sent (or will be sent shortly).

## Data and Audit
- Record send attempt and status for support/debugging (email_logs or email_sends plus email_send_recipients).
- Capture Resend message ID when available.

## Privacy and Compliance
- Treat confirmation emails as transactional; do not include unsubscribe link unless required by policy.
- Avoid storing full review text in logs; only include in the email body.

## Decisions
- Confirmations are transactional and should be sent to anyone who submits, regardless of email subscription status.
- Include full review text in the email.
- Mention moderation status in the email, and confirm the submitter can view their own submitted review regardless of status.
- Link should point to `/dashboard`.
