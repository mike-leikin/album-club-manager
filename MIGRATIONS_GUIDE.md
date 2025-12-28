# Database Migrations Guide

## 🎯 Overview

An automated migration tracking system that ensures database schema changes are applied consistently and safely across environments.

### ✅ Features

- **Automated Tracking**: Records which migrations have been applied
- **Checksum Validation**: Detects if a migration file has been modified after being applied
- **Status Reporting**: See which migrations are pending, applied, or failed
- **Dry Run Mode**: Preview what would be executed without applying anything
- **Rollback Support**: Mark migrations as unapplied (manual reversal required)
- **Interactive Mode**: Shows SQL and confirms execution before marking as applied

---

## 🚀 Quick Start

### 1. Initial Setup

**Run this ONCE to create the migrations tracking table:**

```bash
# Copy and run this SQL in Supabase SQL Editor:
# https://supabase.com/dashboard/project/houteunrytkvhrmagjrg/sql
```

```sql
-- From: supabase/migrations/000_create_migrations_table.sql
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64) NOT NULL,
  execution_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON _migrations(applied_at DESC);
```

### 2. Check Migration Status

```bash
npm run migrate:status
```

**Output:**
```
Migration Status:
==================================================
Total: 5
Applied: 3
Pending: 2

✓ [APPLIED ] 000_create_migrations_table.sql (12/27/2025, 10:30:00 AM) 120ms
✓ [APPLIED ] 001_initial_schema.sql (12/27/2025, 10:31:15 AM) 450ms
✓ [APPLIED ] 002_add_spotify_fields.sql (12/27/2025, 10:32:00 AM) 230ms
○ [PENDING ] 003_add_rs500_table.sql
○ [PENDING ] 004_create_email_logs.sql
```

### 3. Run Pending Migrations

```bash
npm run migrate
```

The tool will:
1. Show you the SQL for each pending migration
2. Give you the Supabase SQL Editor link
3. Wait for you to confirm you ran it
4. Mark it as applied in the tracking table

---

## 📋 Commands

### Run Migrations

```bash
# Run all pending migrations (interactive)
npm run migrate

# Run with dry-run (preview only, no execution)
npm run migrate -- --dry-run

# Run up to a specific migration
npm run migrate -- --target=003_add_rs500_table.sql
```

### Check Status

```bash
# Show migration status
npm run migrate:status
```

### Rollback (⚠️ DANGEROUS)

```bash
# Mark last migration as unapplied
npm run migrate:rollback
```

**WARNING**: Rollback only removes the tracking record. You must **manually reverse** the database changes!

### Help

```bash
npm run migrate help
```

---

## 📝 Creating New Migrations

### Naming Convention

Use sequential numbers with descriptive names:

```
000_create_migrations_table.sql
001_initial_schema.sql
002_add_spotify_fields.sql
003_add_rs500_table.sql
004_create_email_logs.sql
005_add_soft_delete_to_participants.sql
```

### Migration File Template

```sql
-- Description: Brief description of what this migration does
-- Author: Your Name
-- Date: 2025-12-27

-- Migration SQL here
CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);

-- Add comments
COMMENT ON TABLE my_table IS 'Stores my data';
```

### Best Practices

✅ **DO**:
- Use `IF NOT EXISTS` for CREATE statements
- Use `IF EXISTS` for DROP statements
- Add descriptive comments
- Test in development first
- Keep migrations small and focused
- Include rollback instructions in comments

❌ **DON'T**:
- Modify migration files after they've been applied
- Delete old migrations
- Include data changes with schema changes
- Use database-specific features if possible
- Skip testing migrations

---

## 🔧 How It Works

### Migration Tracking Table

The `_migrations` table stores:

| Column | Description |
|--------|-------------|
| `id` | Auto-incrementing ID |
| `name` | Migration filename |
| `applied_at` | When it was applied |
| `checksum` | SHA-256 hash of file content |
| `execution_time_ms` | How long it took |
| `success` | Whether it succeeded |
| `error_message` | Error details if failed |

### Workflow

```
┌─────────────────────────────────────────────┐
│  1. Read migration files from disk          │
│     (supabase/migrations/*.sql)             │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  2. Query _migrations table                 │
│     Get list of applied migrations          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  3. Compare file list vs applied list       │
│     Identify pending migrations             │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  4. For each pending migration:             │
│     a. Display SQL                          │
│     b. Show Supabase SQL Editor link        │
│     c. Wait for user confirmation           │
│     d. Record as applied in _migrations     │
└─────────────────────────────────────────────┘
```

### Checksum Validation

Every migration file's content is hashed (SHA-256). If you modify a migration file after it's been applied, you'll see a warning:

```
⚠️  Warning: Migration 002_add_spotify_fields.sql has been modified since it was applied
```

This helps catch accidental changes to historical migrations.

---

## 🧪 Testing Migrations

### 1. Local Development

```bash
# 1. Create migration file
echo "CREATE TABLE test (id INT);" > supabase/migrations/999_test.sql

# 2. Check status
npm run migrate:status
# Should show 999_test.sql as pending

# 3. Dry run
npm run migrate -- --dry-run
# Preview the SQL without executing

# 4. Run migration
npm run migrate
# Copy SQL, run in Supabase, confirm

# 5. Verify
npm run migrate:status
# Should show 999_test.sql as applied
```

### 2. Rollback Test

```bash
# Rollback last migration
npm run migrate:rollback

# Check status - should be pending again
npm run migrate:status

# Manually drop the table in Supabase
DROP TABLE IF EXISTS test;

# Re-run migration
npm run migrate
```

---

## 🚨 Common Issues

### Issue: "_migrations table does not exist"

**Solution:**
Run the initial setup SQL from `000_create_migrations_table.sql` in Supabase SQL Editor.

### Issue: "Migration already exists" error

**Solution:**
The migration has already been applied. Check status with `npm run migrate:status`.

### Issue: Need to re-run a migration

**Solution:**
```bash
# 1. Rollback the migration
npm run migrate:rollback

# 2. Manually reverse database changes in Supabase

# 3. Re-run migration
npm run migrate
```

### Issue: Modified migration file warning

**Solution:**
Never modify migrations after they've been applied. Create a new migration instead.

---

## 📊 Migration History Example

Current migrations in the project:

| # | File | Description | Status |
|---|------|-------------|--------|
| 000 | `000_create_migrations_table.sql` | Migration tracking system | ✅ Applied |
| 001 | `001_initial_schema.sql` | Initial database schema | ✅ Applied |
| 002 | `002_add_spotify_fields.sql` | Spotify integration fields | ✅ Applied |
| 003 | `003_add_rs500_table.sql` | Rolling Stone 500 albums | ✅ Applied |
| 004 | `004_create_email_logs.sql` | Email delivery tracking | ✅ Applied |
| 005 | `005_add_soft_delete_to_participants.sql` | Soft delete for participants | ✅ Applied |

---

## 🔗 Related Files

**Migration System:**
- `lib/migrations.ts` - Core migration logic
- `scripts/migrate.ts` - CLI tool
- `supabase/migrations/` - Migration files directory

**Package Scripts:**
- `npm run migrate` - Run migrations
- `npm run migrate:status` - Check status
- `npm run migrate:rollback` - Rollback last migration

---

## 💡 Advanced Usage

### Running Specific Migrations

```bash
# Run only up to migration 003
npm run migrate -- --target=003_add_rs500_table.sql
```

### Batch Operations

```bash
# Check status and run migrations in one go
npm run migrate:status && npm run migrate
```

### CI/CD Integration

```bash
# In deployment script:
npm run migrate:status
# If pending migrations exist, alert team or block deployment
```

---

## ✅ Success Criteria

System is working correctly when:

1. ✅ Can create new migration files
2. ✅ `npm run migrate:status` shows accurate counts
3. ✅ Migrations run interactively and record successfully
4. ✅ Checksum validation detects file modifications
5. ✅ Dry run mode previews without applying
6. ✅ Rollback marks migrations as unapplied
7. ✅ Can re-run rolled back migrations

---

**Status:** ✅ Fully implemented and tested

**Last Updated:** 2025-12-27
