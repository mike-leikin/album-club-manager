# Email Tracking System - Setup Guide

## 🎉 What We Built

A complete email delivery tracking and audit trail system for your Album Club app!

### Features Implemented

✅ **Email Logs Database Table**
- Tracks every email send attempt (success and failure)
- Stores participant info, week number, status, timestamps
- Records Resend API message IDs for tracking
- Captures error messages for failed sends
- Foreign keys to participants and weeks tables

✅ **Automatic Email Logging**
- Email sending API (`/api/email/send-week`) now logs every attempt
- Logs successful sends with Resend message ID
- Logs failed sends with error messages
- Non-blocking: logging failures don't prevent emails from sending

✅ **Email Logs API Endpoints**
- `GET /api/email/logs` - Retrieve email logs with filtering
  - Filter by week number, participant ID, or status
  - Returns full log details with participant info
- `GET /api/email/logs/summary` - Get statistics and summary
  - Total emails, sent count, failed count
  - Breakdown by week
- `POST /api/email/retry` - Retry failed emails
  - Automatically finds failed emails for a week
  - Re-sends to participants who didn't receive
  - Logs new attempts

✅ **Email History UI in Admin Dashboard**
- New "Email History" tab in admin dashboard
- Summary cards showing total/sent/failed counts
- Filter by week number and status
- By-week breakdown with retry buttons
- Detailed logs table with all email attempts
- Visual status indicators (✓ Sent, ✗ Failed)
- One-click retry for failed emails per week

---

## 🚀 Setup Instructions

### Step 1: Run the Database Migration

The database table needs to be created. You have two options:

#### Option A: Manual (Recommended)

1. Go to your Supabase dashboard:
   https://supabase.com/dashboard/project/houteunrytkvhrmagjrg

2. Navigate to **SQL Editor** (left sidebar)

3. Click **"New Query"**

4. Copy the SQL from: `supabase/migrations/004_create_email_logs.sql`

5. Paste into the editor and click **"Run"**

#### Option B: Via API Endpoint (If Available)

```bash
curl -X POST http://localhost:3000/api/migrations/email-logs
```

### Step 2: Verify the Table Was Created

Run this SQL in the Supabase SQL Editor:

```sql
SELECT * FROM email_logs LIMIT 1;
```

You should see the table structure with columns:
- `id`, `week_number`, `participant_id`, `participant_email`
- `status`, `sent_at`, `resend_id`, `error_message`

### Step 3: Test Email Tracking

1. Go to your admin dashboard: `/admin`
2. Navigate to the **"Email History"** tab
3. You should see "No email logs found" (this is expected if you haven't sent emails yet)
4. Send a test email from the "Week" tab
5. Refresh the Email History tab - you should see the log entry!

---

## 📊 How to Use Email Tracking

### View Email History

1. Go to **Admin Dashboard** → **Email History** tab
2. See summary cards: Total, Sent, Failed
3. View breakdown by week
4. Filter logs by:
   - Week number
   - Status (sent/failed)

### Retry Failed Emails

**Option 1: From Email History Tab**
1. Go to Email History tab
2. Find the week with failed emails in the "By Week" section
3. Click the **"Retry"** button next to that week
4. Confirm the retry
5. Check the logs to see new attempts

**Option 2: Programmatically**
```bash
curl -X POST http://localhost:3000/api/email/retry \
  -H "Content-Type: application/json" \
  -d '{"weekNumber": 1}'
```

### Check Logs for a Specific Week

**Via UI:**
- Email History tab → Enter week number in "Filter by Week"

**Via API:**
```bash
curl "http://localhost:3000/api/email/logs?week_number=1"
```

### Get Email Summary Statistics

```bash
curl "http://localhost:3000/api/email/logs/summary"
```

Returns:
```json
{
  "summary": {
    "total": 50,
    "sent": 48,
    "failed": 2,
    "byWeek": {
      "1": { "sent": 10, "failed": 0, "total": 10 },
      "2": { "sent": 9, "failed": 1, "total": 10 }
    }
  }
}
```

---

## 🔍 What Gets Logged

For **every email send attempt**, we log:

| Field | Description |
|-------|-------------|
| `week_number` | Which week the email was for |
| `participant_id` | UUID of the recipient (null if deleted) |
| `participant_email` | Email address (preserved even if participant deleted) |
| `status` | `'sent'` or `'failed'` |
| `sent_at` | Timestamp of the attempt |
| `resend_id` | Resend API message ID (for tracking) |
| `error_message` | Error details (only if failed) |

---

## 🛠️ Technical Details

### Database Schema

```sql
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL,
  participant_id UUID, -- UUID to match participants table
  participant_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resend_id VARCHAR(255),
  error_message TEXT,

  CONSTRAINT fk_participant
    FOREIGN KEY (participant_id)
    REFERENCES participants(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_week
    FOREIGN KEY (week_number)
    REFERENCES weeks(week_number)
    ON DELETE CASCADE
);
```

### Files Modified/Created

**New Files:**
- `supabase/migrations/004_create_email_logs.sql` - Database migration
- `app/api/email/logs/route.ts` - Email logs retrieval endpoint
- `app/api/email/logs/summary/route.ts` - Email summary endpoint
- `app/api/email/retry/route.ts` - Retry failed emails endpoint
- `components/EmailHistoryTab.tsx` - Email history UI component
- `app/api/migrations/email-logs/route.ts` - Migration helper endpoint (optional)
- `scripts/run-email-logs-migration.ts` - Migration script (optional)

**Modified Files:**
- `app/api/email/send-week/route.ts` - Added email logging
- `app/admin/page.tsx` - Added Email History tab

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/email/logs` | Retrieve email logs (with filters) |
| `GET` | `/api/email/logs/summary` | Get email statistics |
| `POST` | `/api/email/retry` | Retry failed emails for a week |

---

## ✅ Success Criteria

You'll know the system is working when:

1. ✅ Email logs table exists in Supabase
2. ✅ Sending emails creates log entries
3. ✅ Email History tab shows logs with correct status
4. ✅ Failed emails can be retried via UI
5. ✅ Summary statistics are accurate
6. ✅ Filters work (week number, status)

---

## 🎯 Benefits

**Before Email Tracking:**
- ❌ No record of who received emails
- ❌ Failures only visible in server console
- ❌ No way to retry failed sends
- ❌ No audit trail for compliance

**After Email Tracking:**
- ✅ Complete audit trail of all email sends
- ✅ Know exactly who received emails and when
- ✅ One-click retry for failed emails
- ✅ Filter and search email history
- ✅ Statistics per week
- ✅ Error messages for debugging

---

## 🐛 Troubleshooting

### "No email logs found"

**Cause:** Database table doesn't exist yet
**Solution:** Run the migration (Step 1 above)

### "Failed to load email history"

**Cause:** API endpoint error or database connection issue
**Solution:**
1. Check browser console for errors
2. Check server logs
3. Verify Supabase connection

### Emails send but no logs appear

**Cause:** Migration not run, or logging code not deployed
**Solution:**
1. Verify `email_logs` table exists in Supabase
2. Restart your dev server
3. Check server console for logging errors

### Retry button doesn't work

**Cause:** No failed emails for that week, or retry endpoint error
**Solution:**
1. Check that there are actually failed emails for that week
2. Check browser console and server logs
3. Verify `/api/email/retry` endpoint is accessible

---

## 🚀 Next Steps (Future Enhancements)

1. **Automated Backup Mechanism**
   - Scheduled exports of email logs
   - Email delivery reports via cron job

2. **Email Engagement Tracking**
   - Track email opens (via Resend webhooks)
   - Track link clicks
   - Participant engagement analytics

3. **Advanced Retry Logic**
   - Exponential backoff for retries
   - Max retry limits
   - Smart retry scheduling

4. **Email Templates History**
   - Track which email template was sent
   - Preview historical emails

5. **Notifications**
   - Alert admin if email send fails
   - Daily summary of email delivery stats

---

## 📝 Notes

- Email logs are preserved even if participants are deleted (soft delete)
- Logging failures don't prevent email sends (non-blocking)
- Resend message IDs can be used to check delivery status in Resend dashboard
- The retry endpoint uses the same email template logic as regular sends

---

**Status:** ✅ Fully implemented, pending database migration

**Last Updated:** 2025-12-27
