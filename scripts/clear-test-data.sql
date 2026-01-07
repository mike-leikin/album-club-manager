-- Script to clear all test reviews and weeks
-- Created: 2026-01-03
-- Description: Removes all historical reviews and weeks while preserving participants

-- Start transaction for safety
BEGIN;

-- Delete all reviews
DELETE FROM public.reviews;

-- Delete all weeks
DELETE FROM public.weeks;

-- Delete all email send history
DELETE FROM public.email_send_recipients;
DELETE FROM public.email_sends;

-- Delete all email logs (optional - clears email history too)
DELETE FROM public.email_logs;

-- Verify counts
SELECT 'Reviews remaining:' as info, COUNT(*) as count FROM public.reviews
UNION ALL
SELECT 'Weeks remaining:' as info, COUNT(*) as count FROM public.weeks
UNION ALL
SELECT 'Email sends remaining:' as info, COUNT(*) as count FROM public.email_sends
UNION ALL
SELECT 'Email send recipients remaining:' as info, COUNT(*) as count FROM public.email_send_recipients
UNION ALL
SELECT 'Email logs remaining:' as info, COUNT(*) as count FROM public.email_logs
UNION ALL
SELECT 'Participants kept:' as info, COUNT(*) as count FROM public.participants;

-- Commit the transaction
COMMIT;

-- Display success message
SELECT 'Test data cleared successfully! Participants preserved.' as status;
