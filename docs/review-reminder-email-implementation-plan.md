# Review Reminder Email Implementation Plan

## Phase 1: Product decisions
- Reminders go only to participants with zero reviews for the current week.
- Include a one-click reminder unsubscribe link in the email.

## Phase 2: Data model + types
- Add `reminder_email_subscribed` to `participants` (default true).
- Add `reminder_unsubscribe_token` to `participants` (default `gen_random_uuid()`).
- Update `lib/types/database.ts` and any participant types/interfaces.
- Update `scripts/import-participants.ts` default values, if needed.

## Phase 3: Settings UI
- Extend `app/settings/page.tsx` with a second checkbox for reminder emails.
- Update the save handler to persist both `email_subscribed` and `reminder_email_subscribed`.
- Adjust copy to explain the difference between weekly emails and reminders.

## Phase 4: Reminder email template
- Add a new email builder function in `lib/email/emailBuilder.ts`:
  - `buildReminderEmailTemplate(week)` and `renderReminderEmailTemplate`.
- Subject format: `Reminder: Album Club – Week X` (or date label).
- Body: short nudge, deadline (if present), and submit CTA.
- Include a "Manage preferences" line linking to `/settings`.
- Include a reminder unsubscribe link using `reminder_unsubscribe_token`.

## Phase 5: Reminder send API
- Create `POST /api/email/send-reminder` (curator-only).
- Query current week and eligible participants:
  - `participants` where `deleted_at IS NULL`, `email_subscribed = true`,
    `reminder_email_subscribed = true`.
  - Exclude participants with any `reviews` for the week.
- Create an `email_sends` record with `email_type = reminder` and content snapshot.
- Send emails with the same 2/sec batching as `send-week`.
- Log to `email_send_recipients` and `email_logs`.
- Return counts: sent, failed, skipped.

## Phase 6: Admin UI
- Add "Send Reminder" action on the Week Management tab (near Send Email), only for the current week.
- Show a confirmation modal with recipient count.
- Surface send results and failures in toast notifications.

## Phase 7: Tests + docs
- Unit tests for recipient filtering and reminder template rendering.
- Integration test for reminder send API and logging.
- Update `EMAIL_SETUP.md` to mention reminder emails and the new preference.
