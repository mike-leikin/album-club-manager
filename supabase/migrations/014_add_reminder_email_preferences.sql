-- Add reminder email preferences for review reminder sends
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS reminder_email_subscribed BOOLEAN DEFAULT true;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS reminder_unsubscribe_token UUID DEFAULT gen_random_uuid();

UPDATE public.participants
  SET reminder_email_subscribed = true
  WHERE reminder_email_subscribed IS NULL;

UPDATE public.participants
  SET reminder_unsubscribe_token = gen_random_uuid()
  WHERE reminder_unsubscribe_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_participants_reminder_unsubscribe_token
  ON public.participants(reminder_unsubscribe_token);

COMMENT ON COLUMN public.participants.reminder_email_subscribed IS 'Whether the user wants review reminder emails.';
COMMENT ON COLUMN public.participants.reminder_unsubscribe_token IS 'Unique token for reminder unsubscribe links.';
