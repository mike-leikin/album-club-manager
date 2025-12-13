-- Migration: Add album artwork URL columns to weeks table
-- Created: 2024-12-12
-- Description: Adds columns to store Spotify album artwork URLs for both contemporary and classic albums

-- ============================================================================
-- ADD ALBUM ARTWORK COLUMNS
-- ============================================================================

-- Add contemporary album artwork URL column
ALTER TABLE public.weeks
ADD COLUMN IF NOT EXISTS contemporary_album_art_url TEXT;

-- Add classic album artwork URL column
ALTER TABLE public.weeks
ADD COLUMN IF NOT EXISTS classic_album_art_url TEXT;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.weeks.contemporary_album_art_url IS 'URL to Spotify album artwork for contemporary album';
COMMENT ON COLUMN public.weeks.classic_album_art_url IS 'URL to Spotify album artwork for classic album';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- You can verify the columns were added by running:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'weeks' AND column_name LIKE '%album_art%';
