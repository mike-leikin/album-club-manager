-- Track whether an engagement summary has been sent for each weekly email send
ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS engagement_summary_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_sends_engagement_summary
  ON public.email_sends(engagement_summary_sent_at)
  WHERE engagement_summary_sent_at IS NULL;
