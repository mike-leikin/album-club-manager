-- Migration: Fix security vulnerabilities
-- Created: 2025-02-11
-- Description: Fixes security definer view and enables RLS on migrations table

-- ============================================================================
-- FIX SECURITY DEFINER VULNERABILITY ON ACTIVE_PARTICIPANTS VIEW
-- ============================================================================

-- Set the view to use SECURITY INVOKER so that Row Level Security (RLS)
-- policies are enforced based on the querying user, not the view creator.
-- This addresses Supabase security advisory for SECURITY DEFINER views.

ALTER VIEW public.active_participants SET (security_invoker = true);

COMMENT ON VIEW public.active_participants IS 'View of participants that have not been soft-deleted. Uses security_invoker for proper RLS enforcement.';

-- ============================================================================
-- ENABLE RLS ON _MIGRATIONS TABLE
-- ============================================================================

-- The _migrations table is an internal tracking table that should not be
-- accessible via the public API. Enable RLS with no policies to block all
-- access except via service role (which bypasses RLS).

ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;

-- No policies are created intentionally - this means:
-- - anon and authenticated roles cannot read/write (blocked by RLS)
-- - service_role can still access (bypasses RLS) for running migrations

COMMENT ON TABLE public._migrations IS 'Internal migration tracking table. RLS enabled with no policies to restrict API access.';
