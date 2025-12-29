-- Link a participant record to an auth account
-- Run this in Supabase SQL Editor if your participant record isn't linked

-- First, check the current state
SELECT
  p.id,
  p.name,
  p.email,
  p.auth_user_id,
  p.is_curator,
  au.id as auth_id
FROM participants p
LEFT JOIN auth.users au ON au.email = p.email
WHERE p.email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- To link the participant to the auth user, run this:
-- (Replace YOUR_EMAIL_HERE with your actual email)
UPDATE participants
SET auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
)
WHERE email = 'YOUR_EMAIL_HERE'
  AND auth_user_id IS NULL;

-- Verify the link was created
SELECT
  p.id,
  p.name,
  p.email,
  p.auth_user_id,
  p.is_curator
FROM participants p
WHERE p.email = 'YOUR_EMAIL_HERE';
