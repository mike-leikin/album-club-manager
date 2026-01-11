-- Create review_submission_logs table for failed review submissions
CREATE TABLE IF NOT EXISTS public.review_submission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  week_number INTEGER,
  participant_email TEXT,
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN (
    'validation_failed',
    'participant_not_found',
    'db_error',
    'unexpected_error'
  )),
  error_message TEXT,
  error_code TEXT,
  error_details JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_submission_logs_week_number
  ON public.review_submission_logs(week_number);
CREATE INDEX IF NOT EXISTS idx_review_submission_logs_participant_email
  ON public.review_submission_logs(participant_email);
CREATE INDEX IF NOT EXISTS idx_review_submission_logs_participant_id
  ON public.review_submission_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_review_submission_logs_status
  ON public.review_submission_logs(status);
CREATE INDEX IF NOT EXISTS idx_review_submission_logs_created_at
  ON public.review_submission_logs(created_at DESC);

COMMENT ON TABLE public.review_submission_logs IS 'Failed review submission attempts for debugging and audit trail';

ALTER TABLE public.review_submission_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow curators to read review_submission_logs" ON public.review_submission_logs;
DROP POLICY IF EXISTS "Allow service role full access to review_submission_logs" ON public.review_submission_logs;

CREATE POLICY "Allow curators to read review_submission_logs"
  ON public.review_submission_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow service role full access to review_submission_logs"
  ON public.review_submission_logs
  FOR ALL
  USING (auth.role() = 'service_role');
