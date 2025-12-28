# Safe Participant Management - Implementation Guide

## 🎉 What We Built

A complete soft delete system for participants that **preserves review history** and prevents accidental data loss.

### ✅ Features Implemented

**1. Soft Delete System**
- Participants are marked as deleted (not permanently removed)
- All review history is preserved
- Deleted participants can be restored within any timeframe
- Foreign key constraints updated to preserve data integrity

**2. Warning System Before Deletion**
- Shows exact review count before deleting
- Clear warning that reviews will be preserved
- Confirmation dialog with all details

**3. Visual Indicators**
- Deleted participants shown with strikethrough and "Deleted" badge
- Faded appearance to distinguish from active participants
- Toggle to show/hide deleted participants

**4. Restore Functionality**
- One-click restore for deleted participants
- Immediately returns them to active status
- All their reviews remain intact

---

## 🚀 How It Works

### Database Changes

**Migration File:** `supabase/migrations/005_add_soft_delete_to_participants.sql`

**Changes Made:**
1. Added `deleted_at` column to `participants` table (nullable timestamp)
2. Modified foreign key on `reviews` table from `ON DELETE CASCADE` to `ON DELETE SET NULL`
3. Created index for efficient filtering of active participants
4. Created `active_participants` view for convenience

**Before (DANGEROUS):**
```sql
-- Old constraint - DELETES ALL REVIEWS!
FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
```

**After (SAFE):**
```sql
-- New constraint - PRESERVES REVIEWS
FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL

-- Soft delete column
ALTER TABLE participants ADD COLUMN deleted_at TIMESTAMPTZ;
```

---

## 📋 How to Use

### For Users (Admin Dashboard)

#### Deleting a Participant

1. Go to **Admin Dashboard** → **Participants** tab
2. Click **"Delete"** next to a participant
3. You'll see a warning:
   ```
   Are you sure you want to remove John Doe from the club?

   ⚠️ This participant has 23 reviews.
   Their reviews will be preserved but marked as from a deleted participant.
   ```
4. Click **OK** to confirm
5. Participant is soft-deleted (their reviews are safe!)

#### Viewing Deleted Participants

1. Go to **Participants** tab
2. Click **"Show Deleted"** button (top right)
3. Deleted participants appear faded with a "Deleted" badge
4. Click **"Hide Deleted"** to return to normal view

#### Restoring a Participant

1. Click **"Show Deleted"** to view deleted participants
2. Click **"Restore"** next to the participant you want to restore
3. Confirm the restoration
4. Participant is immediately reactivated with all their reviews intact!

---

## 🔧 Technical Implementation

### API Endpoints

#### `DELETE /api/participants/[id]`
**Soft deletes a participant**

```typescript
// Before deletion, gets review count
const { count } = await supabase
  .from("reviews")
  .select("*", { count: "exact", head: true })
  .eq("participant_id", id);

// Sets deleted_at instead of deleting
await supabase
  .from("participants")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", id);

// Returns review count
return { success: true, reviewCount: count };
```

#### `POST /api/participants/[id]/restore`
**Restores a soft-deleted participant**

```typescript
await supabase
  .from("participants")
  .update({ deleted_at: null })
  .eq("id", id);
```

#### `GET /api/participants/[id]/review-count`
**Gets review count for a participant**

```typescript
const { count } = await supabase
  .from("reviews")
  .select("*", { count: "exact", head: true })
  .eq("participant_id", id);

return { reviewCount: count };
```

#### `GET /api/participants?includeDeleted=true`
**Lists participants (with optional deleted filter)**

```typescript
// Default: only active participants
let query = supabase.from("participants").select("*");

if (!includeDeleted) {
  query = query.is("deleted_at", null);
}
```

---

## 🛡️ Data Safety Features

### What's Protected

✅ **Review History Preserved**
- When a participant is deleted, their reviews remain in the database
- Reviews are marked with `participant_id = null` only if hard-deleted
- Soft delete keeps `participant_id` intact but sets `deleted_at`

✅ **Email Logs Preserved**
- Email logs table already had `ON DELETE SET NULL`
- Participant email is stored in logs even after deletion
- Full audit trail maintained

✅ **Accidental Deletion Prevention**
- Warning shows exact number of reviews before deletion
- Confirmation dialog required
- Can't accidentally hard-delete

✅ **Easy Recovery**
- Restore function available anytime
- No time limit on restorations
- One-click restore process

### What Changed from Before

| Feature | Before (DANGEROUS) | After (SAFE) |
|---------|-------------------|--------------|
| Delete behavior | Hard delete with CASCADE | Soft delete with timestamp |
| Review fate | ❌ Deleted forever | ✅ Preserved |
| Email logs | ❌ Lost | ✅ Preserved |
| Recovery | ❌ Impossible | ✅ One-click restore |
| Warning | Generic | ✅ Shows review count |
| Data loss risk | ⚠️ CRITICAL | ✅ None |

---

## 🧪 Testing

### Test Scenarios

1. **Soft Delete Test**
   ```
   1. Create a test participant
   2. Add several reviews for them
   3. Delete the participant
   4. Verify reviews still exist in database
   5. Verify participant has deleted_at timestamp
   ```

2. **Restore Test**
   ```
   1. Soft delete a participant
   2. Click "Show Deleted"
   3. Click "Restore"
   4. Verify participant is active again
   5. Verify all their reviews are still accessible
   ```

3. **Warning Dialog Test**
   ```
   1. Try to delete a participant with reviews
   2. Verify warning shows correct review count
   3. Cancel and verify nothing changed
   4. Confirm and verify soft delete occurred
   ```

---

## 📊 Database Schema

### participants Table

```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- NULL = active, timestamp = deleted
);

-- Index for efficient filtering
CREATE INDEX idx_participants_deleted_at ON participants(deleted_at)
WHERE deleted_at IS NULL;
```

### reviews Table (Updated Constraint)

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  week_number INTEGER NOT NULL,
  participant_id UUID,  -- Now nullable
  -- ... other columns ...

  CONSTRAINT reviews_participant_id_fkey
    FOREIGN KEY (participant_id)
    REFERENCES participants(id)
    ON DELETE SET NULL  -- Changed from CASCADE
);
```

---

## 🚀 Deployment Steps

### Step 1: Run Migration

**In Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard/project/houteunrytkvhrmagjrg
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy SQL from: `supabase/migrations/005_add_soft_delete_to_participants.sql`
5. Click **"Run"**

### Step 2: Verify Migration

```sql
-- Check deleted_at column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'participants' AND column_name = 'deleted_at';

-- Check foreign key constraint
SELECT constraint_name, delete_rule
FROM information_schema.referential_constraints
WHERE constraint_name = 'reviews_participant_id_fkey';
-- Should show: delete_rule = 'SET NULL'
```

### Step 3: Deploy Code

The code is already deployed! Just need to run the migration.

---

## 💡 Future Enhancements

### Potential Additions

1. **Automatic Cleanup**
   - Schedule to permanently delete participants after 30+ days
   - Configurable retention period
   - Admin notification before permanent deletion

2. **Bulk Operations**
   - Restore multiple participants at once
   - Bulk soft delete
   - Export deleted participants

3. **Audit Trail**
   - Track who deleted/restored participants
   - Deletion reasons/notes
   - History of all status changes

4. **Advanced Filters**
   - Filter by deletion date
   - Search deleted participants
   - Sort by review count

---

## ✅ Success Criteria

System is working correctly when:

1. ✅ Deleting a participant shows review count in warning
2. ✅ After deletion, participant appears in "Show Deleted" view
3. ✅ All reviews from deleted participant still visible
4. ✅ Restore button brings participant back to active status
5. ✅ No data loss occurs during soft delete
6. ✅ Foreign key constraints allow null participant_id
7. ✅ Active participants list excludes deleted by default

---

## 📝 Files Modified/Created

**New Files:**
- `supabase/migrations/005_add_soft_delete_to_participants.sql` - Migration
- `app/api/participants/[id]/restore/route.ts` - Restore endpoint
- `app/api/participants/[id]/review-count/route.ts` - Review count endpoint
- `SAFE_PARTICIPANT_MANAGEMENT.md` - This documentation

**Modified Files:**
- `app/api/participants/[id]/route.ts` - Soft delete implementation
- `app/api/participants/route.ts` - Filter deleted participants
- `components/ParticipantsManager.tsx` - UI for soft delete and restore
- `lib/types/database.ts` - Added deleted_at to Participant type

---

**Status:** ✅ Fully implemented, pending migration

**Last Updated:** 2025-12-27