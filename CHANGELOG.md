# Changelog - Album Club Manager

All notable changes to this project will be documented in this file.

## [2.3.0] - 2026-01-01

### Week Lifecycle Enhancement

**Major Features:**

#### Dashboard Enhancements
- **Show All Weeks**: Dashboard now displays every week (current + previous), not just weeks with existing reviews
- **Current Week Highlighting**: Active week gets green border and "Current" badge
- **Previous Weeks Section**: All past weeks shown in descending order with clear separation
- **Add Reviews to Any Week**: "Add Review" buttons on empty album slots for all weeks
- **No Album Set Placeholders**: Dashed border placeholders when curator hasn't configured an album type

#### Deadline Awareness
- **Past Deadline Badges**: Amber warning badges (⚠️) on weeks where deadline has passed
- **Inline Warnings**: Non-blocking warning message when submitting past deadline
- **Submit Form Enhancement**: Deadline prominently displayed with warning banner if past due
- **Smart Current Week**: Automatically detects current week (latest non-expired, or most recent)

#### User Experience
- **Inline Review Forms**: Add and edit reviews directly in dashboard without page navigation
- **Empty States**: Clear messaging for no reviews, no albums, no weeks scenarios
- **Visual Hierarchy**: Green for current week, amber for past deadlines, clear status indicators
- **Responsive Design**: Mobile-friendly layout for all new components

#### Development Features
- **Dev Mode Bypass**: Access dashboard without authentication using `?dev=true&email=` (development only)
- **Email Parameter Testing**: Test with different participants via URL parameter

**Files Changed:**
- `app/api/my-reviews/route.ts` - Enhanced API to return all weeks with review status
- `app/dashboard/page.tsx` - Complete restructure with current/previous sections
- `app/submit/page.tsx` - Added deadline warning banner
- `middleware.ts` - Development mode authentication bypass
- `WEEK_LIFECYCLE.md` - Comprehensive documentation (new)

**Technical Details:**
- New TypeScript type: `WeekWithReviewStatus`
- Helper functions: `isPastDeadline()`, `determineCurrentWeek()`
- API response includes `allWeeks` array with full week status
- Backwards compatible - existing functionality unchanged

---

## [2.2.0] - 2025-12-28

### Participant Dashboard Complete

**Major Features:**

#### Personal Dashboard
- Participant-specific dashboard showing personal review history
- Album artwork and full week details for each review
- Statistics cards (total reviews, participation rate, average ratings)
- Edit and delete own reviews with inline forms
- Curator dual-access (admin panel + personal dashboard)

#### Review Management
- PATCH `/api/reviews/[id]` - Update reviews (rating, favorite track, text)
- DELETE `/api/reviews/[id]` - Delete reviews with confirmation
- Server-side ownership validation
- RLS policies enforced at database level

#### Authentication Flow
- Protected `/dashboard` route requiring authentication
- Automatic redirect to dashboard after login
- Post-submission redirect for authenticated users
- Empty state with call-to-action for new users

**Files Changed:**
- `app/dashboard/page.tsx` - New participant dashboard UI
- `app/api/my-reviews/route.ts` - New endpoint for user reviews and stats
- `app/api/reviews/[id]/route.ts` - New PATCH/DELETE endpoints
- `middleware.ts` - Protected `/dashboard` route
- `app/submit/page.tsx` - Post-submission redirect
- `app/admin/page.tsx` - "My Reviews" button for curators

---

## [2.1.0] - 2025-12-20

### Authentication & Authorization

**Major Features:**
- Supabase Auth integration (Magic Link + Google OAuth)
- Curator permission system with `is_curator` flag
- Protected admin routes with middleware
- Row Level Security (RLS) policies on all tables
- Auto-linking participants to auth accounts
- Session management with secure cookies

**Files Changed:**
- `middleware.ts` - New route protection
- `lib/auth/` - Auth utilities and helpers
- `app/login/page.tsx` - Login UI
- `app/auth/callback/route.ts` - OAuth callback
- `app/unauthorized/page.tsx` - Access denied page
- `supabase/migrations/006_add_authentication.sql` - Auth schema

---

## [2.0.0] - 2025-12-15

### Database Migration System

**Major Features:**
- Migration tracking table
- Interactive CLI tool (`npm run migrate`)
- Checksum validation
- Rollback capability
- Status reporting
- Execution time tracking

**Files Added:**
- `lib/migrations.ts` - Core migration logic
- `scripts/migrate.ts` - CLI tool
- `supabase/migrations/000_create_migrations_table.sql`

---

## [1.9.0] - 2025-12-10

### Error Monitoring & Structured Logging

**Major Features:**
- Sentry integration (5K events/month free tier)
- Structured logging utility with log levels
- React error boundaries
- Request ID tracking
- Session replay for debugging
- Production/development log modes

**Files Added:**
- Sentry config files (client, server, edge)
- `lib/logger.ts` - Logging utility
- `components/ErrorBoundary.tsx`

---

## [1.8.0] - 2025-12-05

### Safe Participant Management

**Major Features:**
- Soft delete instead of CASCADE
- Warning dialog showing exact review count
- Restore deleted participants
- "Show Deleted" / "Hide Deleted" toggle
- Visual indicators for deleted state
- Foreign key changed from CASCADE to SET NULL

**API Endpoints:**
- `/api/participants/[id]/restore` - Restore deleted participant
- `/api/participants/[id]/review-count` - Get review count

---

## [1.7.0] - 2025-12-01

### Email Tracking & Audit Trail

**Major Features:**
- Email logs table tracking all sends
- Success/failure status tracking
- Resend message ID storage
- Retry failed emails without re-sending to everyone
- Email history tab in admin dashboard
- Per-week statistics and filtering

**Database:**
- `email_logs` table: `{ week_number, participant_id, sent_at, status, error_message }`

**API Endpoints:**
- `/api/email/logs` - Retrieve logs with filtering
- `/api/email/logs/summary` - Statistics by week
- `/api/email/retry` - Retry failed emails

---

## [1.6.0] - 2025-11-25

### Data Export & Backup System

**Major Features:**
- Export all reviews (CSV/JSON)
- Export participants with review counts
- Export week history
- Complete database backup (single JSON file)
- Admin dashboard "Data Export" tab
- One-click downloads

**API Endpoints:**
- `/api/export/full` - Complete backup
- `/api/export/reviews` - All reviews
- `/api/export/participants` - Participant list
- `/api/export/weeks` - Week history

---

## [1.5.0] - 2025-11-20

### Custom Domain & Email Delivery

**Infrastructure:**
- Purchased `albumclub.club` domain
- Configured Vercel custom domain
- Verified domain in Resend
- Configured SPF, DKIM, DMARC records
- Email from: `weekly@albumclub.club`
- App URL: `https://albumclub.club`

---

## [1.4.0] - 2025-11-15

### Email Automation

**Major Features:**
- One-click email sending to all participants
- Personalized review links
- Email preview before sending
- Previous week's results included
- Spotify links for both albums
- HTML email templates with Resend

**Integration:**
- Resend (free tier: 3,000 emails/month)
- From address: `Album Club <weekly@albumclub.club>`

---

## [1.3.0] - 2025-11-10

### UX Improvements (5 Features)

**Features:**
1. **Bulk Participant Import** - CSV upload with email validation
2. **Copy Previous Week** - Auto-populate from week N-1
3. **Week History Browser** - Browse and edit all past weeks
4. **Toast Notifications** - Sonner library for clean feedback
5. **Admin Dashboard Polish** - Loading states, responsive layouts, confirm dialogs

**Impact:** Week setup time reduced from 5 minutes to 30 seconds (94% faster)

---

## [1.2.0] - 2025-11-05

### Rolling Stone 500 Integration

**Major Features:**
- Database table for RS 500 albums
- CSV import script with Spotify enrichment
- All 500 albums imported with artwork
- "Already covered" tracking
- Admin UI RS 500 picker
- Search and filter functionality
- Usage tracking when albums selected
- Artist name formatting fix

**Impact:** Classic album selection takes ~10 seconds with visual feedback

---

## [1.1.0] - 2025-11-01

### Spotify Integration

**Major Features:**
- Spotify API client with OAuth token management
- Album search with auto-populate
- Database migrations for album artwork URLs
- Album artwork throughout app (admin, submit form, emails)
- TypeScript types and error handling

**Impact:** Album setup time reduced from ~5 minutes to ~30 seconds

---

## [1.0.0] - 2025-10-25

### Initial Release

**Core Features:**
- Admin dashboard for week management
- Participant management
- Review submission form
- Database schema (weeks, reviews, participants)
- Basic CRUD operations
- Supabase integration

---

## Version Numbering

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes or major feature releases
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, minor improvements

**Current Version:** 2.3.0
