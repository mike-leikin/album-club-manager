-- Create migrations tracking table
-- This must be run first before any other migrations
-- Tracks which migrations have been applied to prevent re-running

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64) NOT NULL,
  execution_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON _migrations(applied_at DESC);

-- Add comment
COMMENT ON TABLE _migrations IS 'Tracks database migrations that have been applied';
COMMENT ON COLUMN _migrations.name IS 'Migration file name (e.g., 001_create_users.sql)';
COMMENT ON COLUMN _migrations.checksum IS 'SHA-256 hash of migration content to detect changes';
COMMENT ON COLUMN _migrations.execution_time_ms IS 'How long the migration took to run';
COMMENT ON COLUMN _migrations.success IS 'Whether the migration succeeded';
COMMENT ON COLUMN _migrations.error_message IS 'Error details if migration failed';
