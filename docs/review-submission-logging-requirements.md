# Review Submission Logging (Requirements)

## Overview
Add structured logging and a lightweight audit trail for `/api/reviews/submit` so failed review submissions can be diagnosed quickly (who, what, where, and why) without leaking review content.

## Goals
- Capture actionable error context for failed review submissions.
- Correlate client error messages to server-side logs with a request ID.
- Preserve privacy by avoiding storage of review text while still giving useful debug signals.
- Provide a queryable trail for failures (Supabase table or Sentry).

## Non-Goals
- Building a full admin UI for log browsing.
- Capturing or storing full review text content.
- Replacing existing error monitoring tooling (Sentry stays optional).

## Functional Requirements
- Generate a `request_id` for every `POST /api/reviews/submit`.
- Include `request_id` in:
  - JSON responses (success and error), and
  - response header `X-Request-Id`.
- Log each submission attempt using the existing structured logger (`lib/logger.ts`).
- Log level expectations:
  - `INFO` on request received and success.
  - `WARN` on validation failures and participant-not-found.
  - `ERROR` on database failures or unexpected exceptions.
- Logging must be non-blocking; logging failures must not cause request failure.
- Do not log raw `review_text`. Store lengths only.

## Logging Events (Minimum Set)
- `review_submit.received`
  - context: `request_id`, `week_number`, `participant_email`, `has_contemporary`, `has_classic`,
    `contemporary_rating`, `classic_rating`, `review_text_lengths`, `favorite_track_lengths`
- `review_submit.validation_failed`
  - context: `request_id`, `week_number`, `participant_email`, `validation_error`
- `review_submit.participant_not_found`
  - context: `request_id`, `participant_email`
- `review_submit.db_insert_failed`
  - context: `request_id`, `participant_id`, `week_number`, `supabase_error`
- `review_submit.success`
  - context: `request_id`, `participant_id`, `week_number`, `inserted_count`

## Data and Audit Trail
- Persist failed submissions in a new table for quick lookup.
- Keep successful submissions out of the table to reduce noise (logging only).

### Proposed Table: `review_submission_logs`
- `id` UUID (PK)
- `request_id` TEXT (unique)
- `week_number` INTEGER
- `participant_email` TEXT
- `participant_id` UUID (nullable)
- `status` TEXT (`validation_failed`, `participant_not_found`, `db_error`, `unexpected_error`)
- `error_message` TEXT
- `error_code` TEXT (nullable)
- `error_details` JSONB (nullable; includes Supabase error fields)
- `metadata` JSONB (nullable; ratings, review_text_lengths, user_agent)
- `created_at` TIMESTAMPTZ default now()

### Retention
- Retain logs for 90 days (manual cleanup or scheduled job).

## API Surface (Optional Additions)
- `GET /api/admin/review-logs?email=&week_number=&request_id=`
  - Admin-only, returns recent failure logs for debugging.
- If no API is added, logs must still be queryable directly via Supabase SQL.

## Privacy and Security
- Do not store review text; store only lengths.
- Keep emails in logs for support/debugging; if Sentry is enabled, consider hashing emails in Sentry context while keeping raw emails in the DB log.
- Ensure admin-only access to any new log APIs.

## Testing Plan
- Unit
  - `request_id` returned in success and error responses.
  - Validation failure creates a `review_submission_logs` row with `validation_failed`.
  - Database insert failure creates `db_error` log with Supabase error details.
  - No stored logs include `review_text` content.
- Integration
  - Submit review with valid payload logs `review_submit.success`.
  - Invalid rating logs `review_submit.validation_failed` with correct context.
  - Missing participant logs `review_submit.participant_not_found`.

## Engineering Tasks
- Add logging to `app/api/reviews/submit/route.ts` using `createApiLogger`.
- Add `request_id` to responses and header.
- Add migration for `review_submission_logs` table.
- (Optional) Add admin endpoint to query logs.
- Add retention cleanup (cron or manual SQL).

## Open Questions
- Should we store success logs in the DB as well (sampled)?
- What retention window is acceptable for failure logs?
