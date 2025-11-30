# Database Setup Guide

## Overview

This guide covers the database schema for the Album Club Manager application. The app uses Supabase (PostgreSQL) with three main tables: `weeks`, `participants`, and `reviews`.

## Database Schema

### Tables

#### 1. `weeks` (Already exists)
Stores weekly album selections.

```sql
- id: UUID (primary key)
- week_number: INTEGER (unique)
- response_deadline: TEXT (nullable)
- contemporary_title: TEXT (nullable)
- contemporary_artist: TEXT (nullable)
- contemporary_year: TEXT (nullable)
- contemporary_spotify_url: TEXT (nullable)
- classic_title: TEXT (nullable)
- classic_artist: TEXT (nullable)
- classic_year: TEXT (nullable)
- classic_spotify_url: TEXT (nullable)
- rs_rank: INTEGER (nullable)
- created_at: TIMESTAMPTZ
```

#### 2. `participants` (New - needs migration)
Stores album club participants.

```sql
- id: UUID (primary key)
- name: TEXT (required)
- email: TEXT (required, unique)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 3. `reviews` (New - needs migration)
Stores participant reviews for each album. Reviews are completely optional - participants can submit 0, 1, or 2 reviews per week.

```sql
- id: UUID (primary key)
- week_number: INTEGER (required)
- participant_id: UUID (foreign key -> participants.id)
- album_type: TEXT ('contemporary' | 'classic')
- rating: DECIMAL(3,1) (0.0 to 10.0)
- favorite_track: TEXT (nullable)
- review_text: TEXT (max 500 chars, nullable)
- album_recommendation: TEXT (nullable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Note: No unique constraint - participants can skip weeks or submit partial reviews
```

## Setup Instructions

### Step 1: Run the Migration

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/houteunrytkvhrmagjrg
   - Navigate to: **SQL Editor** (left sidebar)

2. **Run Migration SQL**
   - Click **"New Query"**
   - Copy the contents of: `supabase/migrations/001_create_participants_and_reviews.sql`
   - Paste into the SQL editor
   - Click **"Run"**

   Or use the helper script to display the SQL:
   ```bash
   npm run migration:show
   ```

3. **Verify Success**
   - You should see: "Success. No rows returned"
   - Check the **Table Editor** to confirm `participants` and `reviews` tables exist

### Step 2: Test the Database

After running the migration, test that everything works:

```bash
npm run db:test
```

This will:
- Check that all tables exist
- Verify you can read/write data
- Test joined queries (reviews with participants)
- Clean up any test data

### Step 3: Verify in App

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. The admin dashboard should load without errors
3. No changes needed to existing functionality

## TypeScript Types

All database types are defined in: `lib/types/database.ts`

Key types:
- `Week`, `WeekInsert`, `WeekUpdate`
- `Participant`, `ParticipantInsert`, `ParticipantUpdate`
- `Review`, `ReviewInsert`, `ReviewUpdate`
- `ReviewWithParticipant` (joined type)
- `WeekStats` (for aggregated data)

## Security (Row Level Security)

The migration sets up RLS policies:

### Participants Table
- **SELECT**: Public read access (for review form participant selection)
- **INSERT/UPDATE/DELETE**: Service role only (admin operations)

### Reviews Table
- **SELECT**: Public read access (to display results)
- **INSERT**: Public (anyone can submit reviews)
- **UPDATE**: Public (users can edit their reviews)
- **DELETE**: Service role only

### Weeks Table
- Currently no RLS (will add when implementing auth)

## Common Queries

### Get all participants
```typescript
const { data, error } = await supabase
  .from('participants')
  .select('*')
  .order('name');
```

### Get reviews for a specific week with participant info
```typescript
const { data, error } = await supabase
  .from('reviews')
  .select(`
    *,
    participant:participants(name, email)
  `)
  .eq('week_number', weekNumber);
```

### Calculate average rating for a week
```typescript
const { data, error } = await supabase
  .from('reviews')
  .select('rating')
  .eq('week_number', weekNumber)
  .eq('album_type', 'contemporary');

const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
```

### Submit a review
```typescript
const { data, error } = await supabase
  .from('reviews')
  .upsert({
    week_number: 1,
    participant_id: participantId,
    album_type: 'contemporary',
    rating: 8.5,
    favorite_track: 'Track Name',
    review_text: 'This album was amazing...',
  })
  .select()
  .single();
```

## Scripts

Available npm scripts for database operations:

```bash
# Show migration SQL and instructions
npm run migration:show

# Test database connectivity and operations
npm run db:test

# Inspect current database schema
npm run db:inspect
```

(Add these to package.json scripts section)

## Troubleshooting

### Migration fails with "already exists" error
- This is fine! It means the tables were already created
- The migration uses `CREATE TABLE IF NOT EXISTS`

### "Could not find table" error
- Make sure you ran the migration in the Supabase SQL Editor
- Check the Table Editor to verify tables exist
- Verify your environment variables are correct

### RLS blocking queries
- Server-side API routes should use `createServerClient()` to bypass RLS
- Client-side code uses the regular `supabase` client with RLS enforced

### Type errors
- Make sure you're importing types from `@/lib/types/database`
- The Supabase client is typed with `Database` type for autocomplete

## Next Steps

After setting up the database:

1. **Add participants management UI** in the admin dashboard
2. **Create review submission form** for participants
3. **Display review results** in emails and web pages
4. **Add authentication** to protect admin routes

See the main README for the full v1 roadmap.
