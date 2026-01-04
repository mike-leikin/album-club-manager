-- Migration: Create invitations system
-- Description: Friend referral/invitation system with curator approval workflow

-- ============================================================================
-- STEP 1: Create invitations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referral relationship
  referrer_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT,

  -- Security
  invite_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'accepted')),

  -- Approval tracking
  reviewed_by UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Completion tracking
  accepted_at TIMESTAMPTZ,
  invitee_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,

  -- Metadata
  invite_method TEXT NOT NULL CHECK (invite_method IN ('email', 'weekly_email_forward')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_invitations_referrer_id ON public.invitations(referrer_id);
CREATE INDEX idx_invitations_invitee_email ON public.invitations(invitee_email);
CREATE INDEX idx_invitations_invite_token ON public.invitations(invite_token);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_created_at ON public.invitations(created_at DESC);

-- Prevent duplicate pending invites for same email
CREATE UNIQUE INDEX idx_invitations_unique_pending
  ON public.invitations(invitee_email)
  WHERE status = 'pending';

-- Add table comment
COMMENT ON TABLE public.invitations IS 'Tracks friend referral invitations with curator approval workflow';
COMMENT ON COLUMN public.invitations.status IS 'pending: awaiting curator approval, approved: curator approved (awaiting signup), rejected: curator rejected, accepted: invitee completed signup';
COMMENT ON COLUMN public.invitations.invite_method IS 'email: sent via system, weekly_email_forward: user forwarded weekly email';

-- ============================================================================
-- STEP 2: Add updated_at trigger for invitations
-- ============================================================================

-- Create or reuse the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to invitations table
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 3: Add referral tracking columns to participants table
-- ============================================================================

ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.participants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0;

-- Add indexes for referral queries
CREATE INDEX IF NOT EXISTS idx_participants_referred_by ON public.participants(referred_by);
CREATE INDEX IF NOT EXISTS idx_participants_referral_count ON public.participants(referral_count DESC);

-- Add comments
COMMENT ON COLUMN public.participants.referred_by IS 'Participant who referred this user';
COMMENT ON COLUMN public.participants.referral_count IS 'Number of successful referrals (cached for leaderboards)';

-- ============================================================================
-- STEP 4: Row Level Security (RLS) for invitations table
-- ============================================================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Users can read their own sent invitations
CREATE POLICY "Users can read own invitations"
  ON public.invitations
  FOR SELECT
  USING (referrer_id IN (
    SELECT id FROM public.participants WHERE auth_user_id = auth.uid()
  ));

-- Users can create invitations
CREATE POLICY "Authenticated users can create invitations"
  ON public.invitations
  FOR INSERT
  WITH CHECK (
    referrer_id IN (
      SELECT id FROM public.participants WHERE auth_user_id = auth.uid()
    )
  );

-- Curators can read all invitations
CREATE POLICY "Curators can read all invitations"
  ON public.invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

-- Curators can update invitations (approve/reject)
CREATE POLICY "Curators can update invitations"
  ON public.invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

-- Service role full access (for API operations)
CREATE POLICY "Service role full access to invitations"
  ON public.invitations
  FOR ALL
  USING (auth.role() = 'service_role');
