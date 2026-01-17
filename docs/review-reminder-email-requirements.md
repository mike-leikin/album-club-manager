# Review Reminder Emails (Requirements)

## Overview
Send a reminder email for a given week to participants who have not submitted any reviews yet, with an opt-out setting in participant preferences.

## Goals
- Nudge participants who haven't reviewed yet to submit.
- Respect participant email preferences, including a new reminder-specific opt-out.
- Provide an auditable record of reminder sends.

## Non-Goals
- Automating a recurring reminder schedule (manual send only for now).
- Changing the review submission flow or validation rules.
- Building a new analytics dashboard for reminders.

## Functional Requirements
- Trigger: admin-initiated send for the current week only.
- Recipient selection:
  - Active participants only (`deleted_at IS NULL`).
  - Must have `email_subscribed = true`.
  - Must have `reminder_email_subscribed = true` (new preference).
- Must have **zero** reviews for the target week (any album_type counts as a review).
  - Moderation status does not affect eligibility (pending counts as submitted).
- Email content:
  - Subject: `Reminder: Album Club - Reviews due by [due date]` (fallback if no deadline set).
  - Personalized greeting with participant first name.
  - Clear CTA link to submit: `/submit?email=...`.
  - Include the response deadline when available.
  - Include album artist + title details for the current week.
  - Provide both HTML and plain text versions.
  - Do not reference the original weekly send date in the body.
- Include a "manage preferences" line that points to `/settings` (login required).
- Include a one-click unsubscribe link for reminder emails (token-based).
- Send mechanics:
  - Rate limit to <= 2 emails/second to respect Resend limits.
  - Return counts for sent/failed/skipped in the API response.
- Audit trail:
  - Create `email_sends` record with `email_type = reminder`.
  - Create per-recipient rows in `email_send_recipients`.
  - Continue logging to `email_logs` for compatibility with existing UI.

## UX Requirements
- Admin UI (Week Management):
  - Add a "Send Reminder" button for the current week only.
  - Show a confirmation modal with a recipient count before sending.
  - Surface errors and a success count (consistent with weekly send flow).
- Participant Settings:
  - Add a checkbox: "Receive reminder emails".
  - Save alongside existing weekly email preference.
  - Copy should clarify reminders are separate from weekly announcements.

## Data Model
- Add to `participants`:
  - `reminder_email_subscribed BOOLEAN DEFAULT true`
  - `reminder_unsubscribe_token UUID DEFAULT gen_random_uuid()`
  - Comment: "Whether the user wants review reminder emails."
  - Comment: "Unique token for reminder unsubscribe links."
- Update generated types in `lib/types/database.ts`.

## Privacy and Compliance
- Treat reminder emails as non-transactional; honor opt-out.
- Do not include other participants' names or review content.

## Decisions
- Reminders go only to participants with zero reviews for the week.
- Reminders are only for the current week.
- Reminder emails include a one-click unsubscribe link.

## Testing Plan
- Unit
  - Recipient query excludes participants with any review for the week.
  - Reminder respects `email_subscribed` and `reminder_email_subscribed`.
  - Reminder email renders deadline, submit link, and reminder unsubscribe link.
- Integration
  - Admin reminder send returns correct sent/failed/skipped counts.
  - Email logs and email_send_recipients entries are created.
- E2E
  - Curator can send a reminder for the current week.
  - Participant opt-out prevents reminder from being sent.
