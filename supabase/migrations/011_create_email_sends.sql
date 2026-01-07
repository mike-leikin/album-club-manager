-- Migration: Create email_sends and email_send_recipients tables
-- Description: Store email send instances and per-recipient delivery status

-- ============================================================================
-- EMAIL SENDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL REFERENCES public.weeks(week_number) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  created_by UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  source_send_id UUID REFERENCES public.email_sends(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_week_number ON public.email_sends(week_number);
CREATE INDEX IF NOT EXISTS idx_email_sends_created_at ON public.email_sends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_source_send_id ON public.email_sends(source_send_id);

COMMENT ON TABLE public.email_sends IS 'Email send instances with content snapshots';
COMMENT ON COLUMN public.email_sends.email_type IS 'Type of email (weekly_prompt, reminder, results, onboarding, admin_message)';
COMMENT ON COLUMN public.email_sends.source_send_id IS 'Original send reference for resends';

-- ============================================================================
-- EMAIL SEND RECIPIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_send_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID NOT NULL REFERENCES public.email_sends(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  resend_id TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_send_recipients_send_id ON public.email_send_recipients(send_id);
CREATE INDEX IF NOT EXISTS idx_email_send_recipients_participant ON public.email_send_recipients(participant_id);
CREATE INDEX IF NOT EXISTS idx_email_send_recipients_status ON public.email_send_recipients(status);
CREATE INDEX IF NOT EXISTS idx_email_send_recipients_sent_at ON public.email_send_recipients(sent_at DESC);

COMMENT ON TABLE public.email_send_recipients IS 'Per-recipient delivery status for email sends';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow curators to read email_sends" ON public.email_sends;
DROP POLICY IF EXISTS "Allow curators to manage email_sends" ON public.email_sends;
DROP POLICY IF EXISTS "Allow service role full access to email_sends" ON public.email_sends;

CREATE POLICY "Allow curators to read email_sends"
  ON public.email_sends
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow curators to manage email_sends"
  ON public.email_sends
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow service role full access to email_sends"
  ON public.email_sends
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow curators to read email_send_recipients" ON public.email_send_recipients;
DROP POLICY IF EXISTS "Allow curators to manage email_send_recipients" ON public.email_send_recipients;
DROP POLICY IF EXISTS "Allow service role full access to email_send_recipients" ON public.email_send_recipients;

CREATE POLICY "Allow curators to read email_send_recipients"
  ON public.email_send_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow curators to manage email_send_recipients"
  ON public.email_send_recipients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow service role full access to email_send_recipients"
  ON public.email_send_recipients
  FOR ALL
  USING (auth.role() = 'service_role');
