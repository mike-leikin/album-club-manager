# Resend Previously Sent Emails (Admin Feature)

## Overview
Allow admins to manually resend any email that was previously sent to album club participants. This enables catch-up for members who join mid-week and re-delivery of prior weekly emails.

## Goals
- Enable admins to select a previously sent email and resend it to one or more participants.
- Preserve historical context by sending the email content as it was originally sent.
- Respect Resend rate limits (2 requests/second) and provide an audit trail.

## Non-Goals
- Creating new email content or new campaigns.
- Public/member self-service resends.

## Functional Requirements
- Admins can view a list of previously sent emails scoped by week.
- Admins can select an email type: weekly prompt, reminder, results, onboarding, or admin message.
- Admins can select one or more recipients from existing participants, including members who did not receive the original send.
- The resend uses the original email subject/body/template data from the prior send.
- A confirmation step is required before sending.
- Resends are queued and processed at <= 2 sends/second to comply with Resend.
- Send status is recorded (queued, sent, failed) per recipient.

## UX Requirements
- Admin-only access.
- Primary entry point: Email History tab.
- Email History displays a table of email sends grouped by Week #.
- Each row represents a single send instance with:
  - Week #
  - Email type
  - Original send timestamp
  - Recipient count
- Clicking a row opens a detail view showing:
  - Full email content as sent
  - List of original recipients with per-recipient status
  - Multi-select recipients for resend (from the full participant list)
  - Confirmation with count of recipients

## Data and Audit Trail
- Store a resend record with:
  - Original email identifier or snapshot reference
  - Email type and week
  - Recipients list
  - Triggering admin
  - Timestamp
  - Status per recipient and error details
- Record should be queryable for support/debugging.

## Data Model (Current and Proposed)
- Naming convention (current standards):
  - Tables are plural, snake_case, in `public` schema.
  - Primary keys are UUIDs named `id`; timestamps use `created_at`/`updated_at`.
  - API route folders use kebab-case (e.g., `send-week`, `send-test`).
- Current structure uses `email_logs` from `supabase/migrations/004_create_email_logs.sql` with:
  - `week_number`, `participant_id`, `participant_email`, `status`, `sent_at`, `resend_id`, `error_message`
- Gaps for this feature:
  - No send-instance grouping for Email History table rows
  - No email type or content snapshot to render historical content
- Proposed additions (preferred) to support send-instance views:
  - `email_sends` (send instance, aligns with plural table naming):
    - `id`, `week_number`, `email_type`, `subject`, `html_body`, `text_body`, `created_at`, `created_by`, `original_send_at`
  - `email_send_recipients` (per-recipient delivery):
    - `send_id`, `participant_id`, `participant_email`, `status`, `sent_at`, `resend_id`, `error_message`
  - For resends, create a new `email_sends` record linked to the original send via `source_send_id`.
- Alternative: extend `email_logs` to include `send_id`, `email_type`, and content snapshot fields, but this mixes send-instance and per-recipient concerns.

## API Surface (Changes and Additions)
- Existing endpoints:
  - `GET /api/email/logs` (per-recipient email logs).
  - `GET /api/email/logs/summary` (summary stats by week).
  - `POST /api/email/send-week` (bulk weekly send).
  - `POST /api/email/retry` (retry failed sends).
  - `POST /api/email/send-test` (test email send).
- Proposed updates (if adopting `email_sends` + `email_send_recipients`):
  - `GET /api/email/send-history?week_number=...` returns send instances grouped by week.
  - `GET /api/email/send-history/:id` returns send details, content snapshot, and recipients.
  - `POST /api/email/send-history/:id/resend` accepts recipient IDs, queues resend, and returns a resend request ID.
  - `GET /api/email/send-history/:id/resend-status` (optional) returns per-recipient send status.
- If you keep `email_logs` only:
  - Extend `GET /api/email/logs` to return grouped send instances (requires `send_id` and content snapshot fields).
  - Add `POST /api/email/logs/:send_id/resend` to enqueue resends for selected participants.

### API Payload Examples
- `GET /api/email/send-history?week_number=12`
```json
{
  "sends": [
    {
      "id": "0f2a9b4a-2d3f-4e1f-8b45-9cf0a0b6a6b2",
      "week_number": 12,
      "email_type": "weekly_prompt",
      "subject": "Album Club – Week 12",
      "original_send_at": "2025-02-01T18:04:12.000Z",
      "recipient_count": 18
    }
  ]
}
```

- `GET /api/email/send-history/0f2a9b4a-2d3f-4e1f-8b45-9cf0a0b6a6b2`
```json
{
  "send": {
    "id": "0f2a9b4a-2d3f-4e1f-8b45-9cf0a0b6a6b2",
    "week_number": 12,
    "email_type": "weekly_prompt",
    "subject": "Album Club – Week 12",
    "html_body": "<html>...</html>",
    "text_body": "Hi ...",
    "original_send_at": "2025-02-01T18:04:12.000Z"
  },
  "recipients": [
    {
      "participant_id": "9bca3b1a-2ed3-4a0b-8e7c-6f6a0d3c2e91",
      "participant_email": "listener@example.com",
      "status": "sent",
      "sent_at": "2025-02-01T18:04:14.000Z"
    }
  ]
}
```

- `POST /api/email/send-history/0f2a9b4a-2d3f-4e1f-8b45-9cf0a0b6a6b2/resend`
```json
{
  "participant_ids": [
    "9bca3b1a-2ed3-4a0b-8e7c-6f6a0d3c2e91",
    "e12f0c6b-2d43-4f9f-8c9a-5a1b7e4c2f11"
  ]
}
```
```json
{
  "resend_request_id": "5a4f9c2d-7d1b-4b7c-9baf-3f1d8a9d4d2c",
  "queued_count": 2
}
```

## UX Flow
- Admin opens Email History tab.
- Admin selects a Week # group, then clicks a send instance row.
- Detail view loads historical content and original recipients.
- Admin selects recipients (including new recipients), confirms resend.
- UI shows queued/sent/failed statuses as the resend processes.

## Resend Provider Constraints
- Enforce 2 requests/second from the resend job runner.
- Capture provider response IDs for troubleshooting.

## Open Questions
- Should resends support an optional custom preface text block at the top of the email?

## Nice-to-Have / Future Features
- Optional custom preface text block at the top of the email.
- Email History filter by recipient.

## Testing Plan
- Unit
  - Resend job throttles at 2 sends/second.
  - Resend job creates audit entries and status per recipient.
  - Historical snapshot retrieval returns the exact original content.
- Integration
  - Admin flow: select week + email type + recipients, confirm, enqueue.
  - Multi-recipient resend produces one send per recipient with correct content.
  - Failure path: provider error results in failed status and surfaced error.
- E2E
  - Admin user can resend a weekly prompt to a single member.
  - Admin user can resend a reminder to multiple members.
  - Non-admin user cannot access resend action.

## Engineering Tasks
- Data
  - Add table to store sent email snapshots (if not already persisted).
  - Add table for resend requests and per-recipient statuses.
- Backend
  - API endpoint to create resend request (admin-only).
  - Background worker/queue to process resends with rate limit.
  - Provider integration for Resend with response ID capture.
- Frontend
  - Admin UI entry point for resend flow.
  - Recipient multi-select component.
  - Confirmation modal and status display.
- Observability
  - Log resend attempts with request ID and recipient IDs.
  - Error reporting on failed sends.
