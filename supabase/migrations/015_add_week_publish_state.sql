-- Migration: Add publish state to weeks
-- Description: Track when a week becomes current via weekly email sends

ALTER TABLE public.weeks
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_weeks_published_at
  ON public.weeks(published_at DESC);

-- Backfill published_at based on weekly prompt email sends when available.
-- If no weekly sends exist, fall back to created_at to preserve current behavior.
WITH sent_weeks AS (
  SELECT
    week_number,
    MIN(created_at) AS first_sent_at
  FROM public.email_sends
  WHERE email_type = 'weekly_prompt'
  GROUP BY week_number
),
max_sent AS (
  SELECT MAX(week_number) AS max_week_number
  FROM sent_weeks
)
UPDATE public.weeks AS w
SET published_at = COALESCE(
  (SELECT first_sent_at FROM sent_weeks WHERE week_number = w.week_number),
  CASE
    WHEN (SELECT max_week_number FROM max_sent) IS NULL THEN w.created_at
    WHEN w.week_number <= (SELECT max_week_number FROM max_sent) THEN w.created_at
    ELSE NULL
  END
)
WHERE w.published_at IS NULL;

COMMENT ON COLUMN public.weeks.published_at IS 'Timestamp when the weekly email was sent (week becomes current).';
