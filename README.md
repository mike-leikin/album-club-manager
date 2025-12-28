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
- **Review Tracking**: See all reviews submitted by each participant

### 📊 Admin Dashboard
- **Week Management**: Create and edit weekly album selections
- **Copy Previous Week**: Quickly duplicate the previous week's setup
- **Week History Browser**: View and edit all past weeks with album thumbnails
- **Email Preview**: See exactly what participants will receive before sending
- **Toast Notifications**: Clean, non-intrusive feedback for all actions

### 📝 Review Submission
- **Simple Form**: Participants rate albums (1.0-10.0) and share favorite tracks
- **Email Pre-population**: Review links auto-fill participant email addresses
- **Unlimited Text**: No character limits on review comments
- **Mobile Responsive**: Works seamlessly on all devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Sonner for toast notifications
- **Deployment**: Vercel
- **Domain**: Cloudflare DNS

## Database Schema

### Tables
- `participants`: User information (name, email)
- `weeks`: Weekly album selections and deadlines
- `reviews`: Participant ratings and reviews
- `rs_500_albums`: Complete Rolling Stone 500 list with Spotify metadata

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

Run the SQL migrations in your Supabase dashboard (see `supabase/migrations/` directory).

5. Run the development server:

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
3. Click the review link in the email
4. Submit ratings (1.0-10.0) and favorite tracks
5. See previous week's results in the next email

## Project Structure

```
album-club-manager/
├── app/
│   ├── admin/              # Admin dashboard
│   ├── api/
│   │   ├── email/          # Email sending endpoints
│   │   ├── rs500/          # RS 500 album endpoints
│   │   └── spotify/        # Spotify search endpoints
│   ├── submit/             # Review submission form
│   └── page.tsx            # Landing page
├── lib/
│   ├── supabaseClient.ts   # Database client
│   └── spotify.ts          # Spotify API client
├── public/                 # Static assets
└── supabase/               # Database migrations
```

## Configuration

### Email Setup

See [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed instructions on configuring Resend for email delivery.

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
- **Email Sending**: Manual → One-click automated
- **Participant Management**: One-by-one → Bulk CSV import

## Roadmap

See [NEXT_STEPS.md](NEXT_STEPS.md) for the complete feature roadmap and future enhancements.

### Critical Priorities
- Data backup & export system
- Email delivery tracking
- Error monitoring & structured logging

### High Priorities
- Deadline enforcement
- Review moderation tools
- Authentication & access control

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for music lovers everywhere.
