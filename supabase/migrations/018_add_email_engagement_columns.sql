-- Add open and click tracking columns to email_send_recipients
ALTER TABLE public.email_send_recipients
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_send_recipients_opened_at
  ON public.email_send_recipients(opened_at)
  WHERE opened_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_send_recipients_clicked_at
  ON public.email_send_recipients(clicked_at)
  WHERE clicked_at IS NOT NULL;
