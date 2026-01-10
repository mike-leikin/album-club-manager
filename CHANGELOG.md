# Changelog - Album Club Manager

All notable changes to this project will be documented in this file.

## [2.13.5] - 2026-01-07

### Review Submissions

- Allow review submissions from unregistered emails by auto-creating participants
- Updated review submission tests to cover the new participant creation flow

---

## [2.13.4] - 2026-01-07

### Monitoring

- Added Sentry instrumentation for client/server/edge runtimes
- Added global error boundary capture
- Added Sentry example page and API route for connectivity testing

---

## [2.13.2] - 2026-01-06

### Curator Dashboard UI

**Bug Fixes:**
- Unified top action buttons with consistent height, color, and wrapping behavior
- Improved form label, placeholder, and helper text contrast on the week setup form
- Updated Spotify search input/results to a light theme with dark text

---

## [2.13.3] - 2026-01-07

### Documentation

- Clarified Sentry DSN setup and consistency checks across client/server/edge configs
- Added Sentry DSN consistency item to Next Steps

---

## [2.13.1] - 2026-01-06

### Dashboard Review Form

**Bug Fixes:**
- Darkened input text and placeholder contrast for rating, favorite track, and review fields

---

## [2.13.0] - 2026-01-06

### Email History & Manual Resends

**Major Features:**
- **Email History Tab**: Send-instance table grouped by week with content preview and recipient status
- **Manual Resends**: Select any participants (including missed recipients) and resend historical emails
- **Send Snapshot Storage**: New `email_sends` + `email_send_recipients` tables with RLS policies
- **Backfill Tooling**: Script to rebuild send history from legacy `email_logs`
- **Template Rendering**: Shared weekly email template placeholders for consistent resends

**API Endpoints:**
- GET `/api/email/send-history` - List send instances with recipient counts
- GET `/api/email/send-history/[id]` - Fetch send content, recipients, preview
- POST `/api/email/send-history/[id]/resend` - Resend to selected participants

**Files Changed:**
- Database: `supabase/migrations/011_create_email_sends.sql`
- Email Builder: `lib/email/emailBuilder.ts`
- Weekly Send: `app/api/email/send-week/route.ts`
- Send History APIs: `app/api/email/send-history/route.ts`, `app/api/email/send-history/[id]/route.ts`, `app/api/email/send-history/[id]/resend/route.ts`
- Admin UI: `components/EmailHistoryTab.tsx`
- Backfill Script: `scripts/backfill-email-sends.ts`

---

## [2.12.0] - 2026-01-05

### Light Theme Fixes for Curator Dashboard

**Bug Fixes:**

#### Week Management Tab
- **Button Visibility**: Fixed all action buttons (Copy from Previous Week, Save Week, Preview Email, Send Test Email, Send Email) by adding proper background colors - buttons now have colored backgrounds instead of transparent with colored borders
- **Invalid Color Classes**: Replaced all instances of non-existent `text-gray-9000` with proper Tailwind gray values (`text-gray-600`)
- **Character Counter**: Fixed custom message character counter text color for better visibility

#### Email Preview Modal
- **Theme Conversion**: Converted modal from dark theme to light theme
- **Background**: Changed from `bg-zinc-950` to `bg-white`
- **Borders**: Updated from `border-zinc-800` to `border-gray-200`
- **Text Colors**: Updated all text to proper light theme colors (`text-gray-900`, `text-gray-700`, etc.)
- **Warning Banner**: Changed from yellow dark theme to yellow light theme (`bg-yellow-50`, `text-yellow-900`)

#### Week History Tab
- **Card Backgrounds**: Converted from dark (`bg-zinc-900/50`) to light (`bg-gray-50`)
- **Text Contrast**: Added proper text colors for all headings and labels
- **Album Placeholders**: Changed from `bg-zinc-800` to `bg-gray-200`
- **Category Labels**: Updated Contemporary and Classic labels from dark purple/emerald to light versions
- **Button Backgrounds**: Added solid backgrounds to Edit and Delete buttons

#### Data Export Tab
- **Export Cards**: Converted all four export cards from dark to light theme
- **Button Styling**: Updated CSV/JSON download buttons with proper light theme colors
- **Backup Warning**: Changed warning banner from yellow dark theme to light theme

**Files Changed:**
- `app/admin/page.tsx` - Fixed all light theme contrast issues across Week Management, Email Preview Modal, Week History, and Data Export tabs

**Technical Details:**
- Button fix: Added `bg-blue-500`, `bg-purple-500`, `bg-amber-500`, `bg-red-500` backgrounds
- Color corrections: `text-gray-9000` → `text-gray-600`
- Systematic theme conversion: zinc/dark colors → gray/light colors throughout
- All changes maintain existing functionality and user experience

---

## [2.11.0] - 2026-01-03

### Friend Referral System

**Major Features:**

#### User Invitation System
- **Any User Can Invite**: Members can invite friends via Settings page or weekly email forwards
- **Curator Approval Required**: All invitations go through curator review before signup
- **Referral Tracking**: Complete tracking of who invited whom with referral counts
- **Invitation History**: Users view status of all sent invitations (pending/approved/accepted/rejected)

#### Two Invitation Methods
- **Direct Email**: Enter friend's email and name in Settings page
- **Weekly Email Forward**: Referral link in footer of weekly album emails
- **Shareable Links**: Forward-to-friend page with copyable invitation message
- **Unique Tokens**: Secure UUID-based invite tokens for signup validation

#### Admin Moderation
- **Invitations Tab**: New admin dashboard tab for reviewing pending invitations
- **Referrer Context**: Shows inviter's name, history, and previous referral count
- **Approve/Reject**: Curators approve or reject with optional reason notes
- **Status Tracking**: Complete workflow (pending → approved/rejected → accepted)

#### Signup Integration
- **Token Verification**: Validates invite tokens are approved before signup
- **Pre-filled Email**: Email address auto-populated from invitation
- **Referral Linking**: New participants automatically linked to referrer
- **Count Updates**: Referrer's referral count increments on successful signup

**Database Schema:**
- New `invitations` table with full referral tracking
  - Fields: referrer_id, invitee_email, invite_token, status, reviewed_by, etc.
  - Invite methods: 'email' and 'weekly_email_forward'
  - Statuses: pending, approved, rejected, accepted
- Updated `participants` table with:
  - `referred_by` (UUID FK to participants)
  - `referral_count` (integer counter)
- RLS policies for user and curator access control

**API Endpoints:**
- POST `/api/invitations/create` - User creates invitation via email
- POST `/api/invitations/generate-link` - Generate referral link from weekly email
- GET `/api/invitations/my-invites` - User's invitation history
- GET `/api/invitations/verify` - Verify invite token (public)
- GET `/api/admin/invitations/pending` - List pending invitations (curator)
- POST `/api/admin/invitations/[id]/approve` - Approve invitation (curator)
- POST `/api/admin/invitations/[id]/reject` - Reject invitation with reason (curator)
- POST `/api/auth/signup` - Modified to accept invite_token parameter

**UI Components:**
- `app/settings/page.tsx` - Added invite form and invitation history
- `components/InvitationsManager.tsx` - Curator approval interface
- `app/admin/page.tsx` - New "Invitations" tab in admin dashboard
- `app/invite/[token]/page.tsx` - Public signup page for approved invitations
- `app/invite-friend/page.tsx` - Referral landing page from weekly emails
- `app/api/email/send-week/route.ts` - Added "Forward to a Friend" link in email footer

**User Flow:**
1. User invites friend via Settings → curator reviews → approves → friend receives signup link
2. User forwards weekly email → friend clicks referral link → enters email → curator approves → friend receives signup link
3. Friend completes signup with invite token → account created → referrer's count increments

**Technical Details:**
- UUID tokens with unique constraint for security
- One-time use tokens (status changes to 'accepted')
- Referrer information visible during signup for context
- Status badges in Settings page (pending/approved/accepted/rejected)
- TODO: Email notifications for approval/rejection (infrastructure ready)

**Files Changed:**
- Database: `supabase/migrations/010_create_invitations_system.sql`
- Types: `lib/types/database.ts` (Invitation types)
- User APIs: `app/api/invitations/` (create, generate-link, my-invites, verify)
- Admin APIs: `app/api/admin/invitations/` (pending, approve, reject)
- Signup: `app/api/auth/signup/route.ts` (invite token handling)
- Settings: `app/settings/page.tsx` (invite form, history)
- Admin: `app/admin/page.tsx` (Invitations tab)
- Component: `components/InvitationsManager.tsx`
- Pages: `app/invite/[token]/page.tsx`, `app/invite-friend/page.tsx`
- Email: `app/api/email/send-week/route.ts` (referral link in footer)

---

## [2.10.0] - 2026-01-03

### Curator Dashboard UX Improvements

**Major Features:**

#### Auto-Incrementing Week Numbers
- **Hidden Week Number Field**: Week number input removed from curator dashboard
- **Automatic Increment**: Week numbers auto-increment based on latest week
- **Display Only**: Week number shown in section header as "This Week's Setup (Week X)"
- **Chronological Order**: Weeks maintained in descending order (most recent first)

#### Week Deletion
- **Delete Weeks**: Curators can now delete weeks from Week History tab
- **Confirmation Dialog**: Warning prompt before deletion explaining associated reviews will be deleted
- **Loading States**: Delete button shows "Deleting..." during operation and is disabled
- **Auto-Refresh**: Week history automatically refreshes after successful deletion
- **Protected Endpoint**: DELETE operation requires curator authentication

#### Enhanced Date Picker
- **Dark Mode Calendar**: Native browser date picker now renders in dark mode
- **Minimum Date**: Response deadline restricted to today or future dates
- **Better UX**: Color scheme matches app's dark theme

**Files Changed:**
- `app/admin/page.tsx` - Removed week number input, added auto-increment logic and delete functionality
- `app/api/weeks/route.ts` - Added DELETE endpoint, improved GET to support week_number parameter
- `lib/types/database.ts` - Week number remains in database schema

**Technical Details:**
- Week number auto-calculated on component mount: `latest.week_number + 1`
- DELETE endpoint: `/api/weeks?week_number={num}` (curator auth required)
- Uses native `confirm()` for deletion confirmation
- Date picker uses `[color-scheme:dark]` Tailwind utility
- Maintains backward compatibility with existing weeks

---

## [2.5.0] - 2026-01-01

### Landing Page UX Enhancement

**Major Features:**

#### Reviewer-Focused Landing Page
- **Updated Branding**: Changed from "Album Club Manager" to "Album Club" for broader appeal
- **Welcoming Copy**: New description "Discover new music, share your thoughts, and explore albums together"
- **Smart Routing**: Role-based navigation - curators to admin, reviewers to dashboard
- **Simplified Experience**: Landing page now welcoming for all users, not just curators

**Files Changed:**
- `app/page.tsx` - Updated title, description, and role-based routing logic

**Technical Details:**
- Added `isCurator` state check on landing page
- Automatic routing: curators → `/admin`, regular users → `/dashboard`
- TypeScript type assertion for participant query
- Maintains backwards compatibility for curator workflows

---

## [2.4.0] - 2026-01-01

### Public Reviews Feature

**Major Features:**

#### Public Reviews Page
- **Browse All Reviews**: Public `/reviews` page shows all weeks past their deadline
- **Privacy Protection**: Reviews display first names only (full names hidden)
- **Smart Visibility**: Current week locked until deadline passes, then reviews become visible
- **Lazy Loading**: Reviews fetched only when week is expanded for better performance
- **Full Details**: Shows complete review information (rating, favorite track, review text)

#### User Experience
- **Expandable Weeks**: Accordion-style UI - click to expand and view all reviews
- **Album Grouping**: Reviews organized by contemporary/classic albums
- **Average Ratings**: Shows average rating for each album with review count
- **Album Artwork**: Full album metadata and artwork displayed
- **Locked State**: Clear "🔒 Locked" indicator for current week until deadline
- **Empty States**: Helpful messages when no reviews submitted yet

#### Navigation
- **Dashboard Link**: "Browse Reviews" button in participant dashboard header
- **Home Page Link**: "Browse reviews" link on landing page
- **Easy Access**: Public page - no authentication required

**Files Changed:**
- `lib/utils/names.ts` - New utility to extract first names from full names
- `app/reviews/page.tsx` - Complete public reviews browsing page (new)
- `app/api/weeks/route.ts` - Added `?all=true` parameter to return all weeks
- `app/dashboard/page.tsx` - Added "Browse Reviews" navigation link
- `app/page.tsx` - Added "Browse reviews" link to home page

**Technical Details:**
- First name extraction: `getFirstName()` utility handles edge cases (single name, empty, etc.)
- Lazy loading: Reviews API called only when week section expanded
- Backwards compatible: `/api/weeks` still returns single week by default
- Performance optimized: Week metadata loaded upfront, reviews on-demand
- TypeScript types: `WeekWithReviews`, `AlbumReviews`, `ReviewWithParticipant`

---

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

**Current Version:** 2.13.2
