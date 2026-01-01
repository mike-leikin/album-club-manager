# Album Club Manager

A full-stack web application for managing a music album club with automated email notifications, Spotify integration, and comprehensive admin tools.

🌐 **Live App**: [albumclub.club](https://albumclub.club)

## Overview

Album Club Manager streamlines the process of running a weekly music club where participants listen to and review two albums: a contemporary pick and a classic from Rolling Stone's 500 Greatest Albums list. The app automates participant management, email notifications, and review collection.

## Key Features

### 🎵 Album Management
- **Spotify Integration**: Search and auto-populate album details with artwork directly from Spotify
- **Rolling Stone 500 Database**: Browse and select from the complete RS 500 list with visual thumbnails
- **Usage Tracking**: Automatically track which classic albums have been covered and when
- **Album Artwork**: Beautiful album art displayed throughout the app (admin, submit form, emails)

### 📧 Automated Email System
- **One-Click Email Sending**: Send personalized emails to all participants from the admin dashboard
- **Professional HTML Templates**: Beautiful, responsive email design with album artwork
- **Personalized Review Links**: Each participant gets a unique link with their email pre-filled
- **Previous Week Results**: Automatically include ratings and favorite tracks from the previous week
- **Custom Domain**: Emails sent from `weekly@albumclub.club` with full SPF/DKIM verification

### 👥 Participant Management
- **Bulk CSV Import**: Add multiple participants at once via CSV upload
- **Individual Management**: Add, edit, or remove participants through the admin interface
- **Safe Deletion**: Soft delete preserves all review history with one-click restore capability
- **Review Tracking**: See all reviews submitted by each participant

### 🔐 Authentication & Access Control
- **Magic Link**: Passwordless email login for seamless authentication
- **Google OAuth**: Available but currently disabled in UI (ready to re-enable)
- **Curator Permissions**: Role-based access control with `is_curator` flag
- **Protected Routes**: Admin dashboard and participant dashboard require authentication
- **Auto-linking**: Existing participants automatically linked to auth accounts on signup
- **Session Management**: Secure cookie-based sessions with Supabase Auth
- **Custom Email Template**: Branded magic link emails matching Album Club design
- **Participant Dashboard**: Personal review history, editing, and statistics for all users
- **Curator Dual-Access**: Curators can access both admin panel and their own reviews

### 📊 Admin Dashboard
- **Week Management**: Create and edit weekly album selections
- **Copy Previous Week**: Quickly duplicate the previous week's setup
- **Week History Browser**: View and edit all past weeks with album thumbnails
- **Email Preview**: See exactly what participants will receive before sending
- **Email Delivery Tracking**: Complete audit trail with retry capability for failed sends
- **Data Export**: One-click export of all reviews, participants, and week history
- **Toast Notifications**: Clean, non-intrusive feedback for all actions

### 📝 Review Submission & Management
- **Simple Form**: Participants rate albums (1.0-10.0) and share favorite tracks
- **Email Pre-population**: Review links auto-fill participant email addresses
- **Unlimited Text**: No character limits on review comments
- **Mobile Responsive**: Works seamlessly on all devices
- **Participant Dashboard**: View all submitted reviews with statistics
- **Review Editing**: Edit ratings, favorite tracks, and review text inline
- **Review Deletion**: Delete reviews with confirmation dialog
- **Personal Statistics**: Track participation rate and average ratings

### 📅 Week Lifecycle & Deadlines (v2.3)
- **All Weeks Visible**: Dashboard shows current week + all previous weeks
- **Current Week Highlighting**: Green border and badge for active week
- **Past Deadline Warnings**: Non-blocking amber badges when deadline has passed
- **Add Reviews Anytime**: Submit reviews to any week (past or present)
- **No Album Set Indicators**: Clear placeholders when curator hasn't set an album
- **Deadline Display**: Prominently show deadlines on submit form and dashboard
- **Catch Up on Missed Weeks**: Easily find and review weeks you missed
- **Post-Submission Flow**: Authenticated users redirect to dashboard after submitting

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **Error Monitoring**: Sentry (optional)
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Sonner for toast notifications
- **Deployment**: Vercel
- **Domain**: Cloudflare DNS

## Database Schema

### Tables
- `participants`: User information (name, email, auth_user_id, is_curator) with soft delete support
- `weeks`: Weekly album selections and deadlines
- `reviews`: Participant ratings and reviews (linked to participants via participant_id)
- `rs_500_albums`: Complete Rolling Stone 500 list with Spotify metadata
- `email_logs`: Email delivery tracking and audit trail
- `_migrations`: Database migration tracking with checksums
- Supabase Auth tables: `auth.users` managed by Supabase

**Note**: The `reviews` table uses `week_number` (integer) to reference weeks, not a foreign key relationship.

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account
- Spotify Developer account
- Resend account (for emails)
- Custom domain (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/album-club-manager.git
cd album-club-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Spotify
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Resend (Email)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL="Album Club <weekly@yourdomain.com>"

# App URL (for generating review links in emails)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

4. Set up the database:

Use the automated migration tool to track and apply database changes:

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate

# Get help
npm run migrate help
```

See [MIGRATIONS_GUIDE.md](MIGRATIONS_GUIDE.md) for detailed instructions.

5. Set up authentication:

Configure Supabase Auth in the Supabase Dashboard:
- Enable Google OAuth provider (optional)
- Configure email provider (Magic Link - enabled by default)
- Set Site URL and Redirect URLs
- See [AUTH_GUIDE.md](AUTH_GUIDE.md) for detailed instructions

Set your first curator in the database:
```sql
UPDATE participants SET is_curator = true WHERE email = 'your.email@example.com';
```

6. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

### Admin Workflow

1. **Add Participants**: Go to the Participants tab and add members via the form or CSV import
2. **Create a Week**:
   - Enter the week number and deadline
   - Search for albums using Spotify integration
   - Or select a classic album from the RS 500 picker
3. **Preview Email**: Click "Preview Email" to see what participants will receive
4. **Send Emails**: Click "📧 Send Email" to notify all participants
5. **View Results**: Reviews appear automatically as participants submit them

### Participant Workflow

1. Receive personalized email with album details and Spotify links
2. Listen to both albums
3. Click the review link in the email (or visit `/submit`)
4. Submit ratings (1.0-10.0) and favorite tracks
5. Authenticated users are redirected to personal dashboard
6. View review history, statistics, and edit past reviews
7. See previous week's results in the next email

## User Management

### Authentication

**Sign In**: Visit [albumclub.club/login](https://albumclub.club/login)

**Methods**:
- **Magic Link** (recommended): Enter your email, receive a secure login link
- **Google OAuth**: Currently disabled in UI, but can be re-enabled by uncommenting code in [app/login/page.tsx](app/login/page.tsx)

### Managing Curators

Curators have full access to the admin dashboard and can manage weeks, participants, and send emails.

**Add a curator** (run in Supabase SQL Editor):
```sql
UPDATE participants
SET is_curator = true
WHERE email = 'user@example.com';
```

**Remove curator access**:
```sql
UPDATE participants
SET is_curator = false
WHERE email = 'user@example.com';
```

**View all curators**:
```sql
SELECT name, email, auth_user_id
FROM participants
WHERE is_curator = true;
```

### How Auto-linking Works

When a user signs up via Magic Link or Google OAuth:
1. Supabase creates an `auth.users` record
2. A database trigger automatically checks for an existing participant with that email
3. If found, the participant's `auth_user_id` is linked to the new auth account
4. If not found, a new participant record is created
5. User can now sign in and access features based on their `is_curator` status

**Note**: Only curators can access the `/admin` dashboard. Non-curators who sign in will be redirected to their personal dashboard at `/dashboard` where they can view and manage their reviews.

### Participant Dashboard Access

All authenticated users (curators and non-curators) have access to `/dashboard`:
- View personal review history with album artwork
- Edit ratings, favorite tracks, and review text
- Delete reviews with confirmation
- See participation statistics (total reviews, participation rate, average ratings)

**Curator Features**:
- Curators see an "Admin Panel" button in their dashboard to access `/admin`
- In the admin panel, curators see a "My Reviews" button to return to their dashboard
- This allows curators to both manage the club AND submit their own reviews

## Project Structure

```
album-club-manager/
├── app/
│   ├── admin/              # Admin dashboard (curator-only)
│   ├── dashboard/          # Participant dashboard (all authenticated users)
│   ├── api/
│   │   ├── email/          # Email sending endpoints
│   │   ├── my-reviews/     # Personal review history endpoint
│   │   ├── reviews/[id]/   # Review edit/delete endpoints
│   │   ├── rs500/          # RS 500 album endpoints
│   │   └── spotify/        # Spotify search endpoints
│   ├── auth/               # Authentication callback handlers
│   ├── login/              # Login page (Magic Link)
│   ├── submit/             # Review submission form
│   ├── unauthorized/       # Access denied page
│   └── page.tsx            # Landing page
├── lib/
│   ├── auth/               # Authentication utilities
│   ├── supabaseClient.ts   # Database client
│   └── spotify.ts          # Spotify API client
├── middleware.ts           # Route protection middleware
├── public/                 # Static assets
└── supabase/               # Database migrations
```

## Configuration

### Email Setup

See [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed instructions on configuring Resend for email delivery.

### Error Monitoring (Optional)

See [ERROR_MONITORING_SETUP.md](ERROR_MONITORING_SETUP.md) for instructions on setting up Sentry for error tracking and structured logging.

### Database Migrations

See [MIGRATIONS_GUIDE.md](MIGRATIONS_GUIDE.md) for instructions on using the automated migration tracking system.

### Spotify Integration

1. Create a Spotify app at [developer.spotify.com](https://developer.spotify.com)
2. Add your Client ID and Secret to `.env.local`
3. The app uses Client Credentials flow (no user OAuth required)

### Custom Domain

For production deployment with custom email domain:

1. Purchase a domain (e.g., via Cloudflare)
2. Add domain to Resend
3. Configure DNS records (SPF, DKIM, MX)
4. Update environment variables with your domain
5. Redeploy on Vercel

## Performance Metrics

- **Week Setup Time**: 5 minutes → 30 seconds (94% faster with Spotify integration)
- **Email Sending**: Manual → One-click automated with delivery tracking
- **Participant Management**: One-by-one → Bulk CSV import with safe deletion
- **Migration Tracking**: Manual → Automated with status reporting

## Roadmap

See [NEXT_STEPS.md](NEXT_STEPS.md) for the complete feature roadmap and future enhancements.

### ✅ Completed Features (v2.3)
- ✅ **Week Lifecycle Management** (v2.3) - All weeks visible, deadline warnings, add reviews anytime
- ✅ Data backup & export system
- ✅ Email delivery tracking & audit trail
- ✅ Error monitoring & structured logging
- ✅ Safe participant management with soft delete
- ✅ Database migration tracking system
- ✅ Authentication & authorization (Google OAuth, Magic Link, curator permissions)
- ✅ Participant dashboard (personal review history, editing, deletion)
- ✅ Review statistics (participation rate, average ratings)
- ✅ Curator dual-access (admin panel + personal dashboard)
- ✅ Post-submission redirect to dashboard

### High Priorities
- Hard deadline enforcement (block submissions after deadline)
- Admin review moderation tools (edit/delete any review)
- Testing infrastructure
- Curator management UI (promote/demote without SQL)
- Review history audit trail (track changes over time)
- Automated email reminders before deadlines

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Documentation

- [NEXT_STEPS.md](NEXT_STEPS.md) - Complete feature roadmap and future enhancements
- [WEEK_LIFECYCLE.md](WEEK_LIFECYCLE.md) - Week lifecycle enhancement documentation (v2.3)
- [CHANGELOG.md](CHANGELOG.md) - Complete version history
- [PARTICIPANT_DASHBOARD.md](PARTICIPANT_DASHBOARD.md) - Participant dashboard features (v2.2)
- [AUTH_GUIDE.md](AUTH_GUIDE.md) - Authentication setup and configuration
- [MIGRATIONS_GUIDE.md](MIGRATIONS_GUIDE.md) - Database migration system
- [EMAIL_TRACKING_SETUP.md](EMAIL_TRACKING_SETUP.md) - Email delivery tracking
- [ERROR_MONITORING_SETUP.md](ERROR_MONITORING_SETUP.md) - Sentry integration
- [SAFE_PARTICIPANT_MANAGEMENT.md](SAFE_PARTICIPANT_MANAGEMENT.md) - Soft delete and restore

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for music lovers everywhere.
