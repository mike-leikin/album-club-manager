# Album Club Manager - Product Roadmap

## Current Status: v1.0 ✅ (Completed)

### What's Live
- Participant management (CRUD operations)
- Review submission form (public-facing)
- Review statistics in weekly emails
- Week management with Supabase persistence
- Full admin dashboard with tabs
- Deployed to Vercel at https://album-club-manager.vercel.app

---

## Phase 2: UX Improvements & Data Import

### 2.1 Rolling Stone 500 Integration
**Goal**: Import the full Rolling Stone 500 greatest albums list with metadata

**Tasks**:
- [ ] Create migration for `rs_500_albums` table
  - Fields: `rank`, `title`, `artist`, `year`, `genre`, `spotify_id`, `album_art_url`, `description`
- [ ] Build data import script (`scripts/import-rs500.ts`)
  - Parse Rolling Stone 500 data (CSV or JSON)
  - Fetch Spotify metadata for each album
  - Store in database with deduplication
- [ ] Add RS 500 album picker to admin dashboard
  - Dropdown/autocomplete to select from imported albums
  - Auto-populate album details when selected
  - Show album rank and cover art in picker
- [ ] Display previously used RS 500 albums
  - Track which albums have been selected in past weeks
  - Show "used" indicator in picker
  - Filter to show only unused albums

**Benefits**:
- No manual entry for classic albums
- Ensures accurate album metadata
- Prevents selecting the same album twice
- Professional album artwork display

---

### 2.2 Spotify API Integration
**Goal**: Automatically fetch album details and artwork from Spotify

**Tasks**:
- [ ] Set up Spotify API credentials
  - Register app in Spotify Developer Dashboard
  - Add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` to environment variables
- [ ] Create Spotify API service (`lib/spotifyClient.ts`)
  - OAuth client credentials flow
  - Search albums by title/artist
  - Fetch album details (tracks, artwork, release date)
- [ ] Add "Search Spotify" feature to admin dashboard
  - Contemporary album section: search button
  - Display results with album art thumbnail
  - One-click populate all fields (title, artist, year, artwork URL, Spotify link)
- [ ] Create `album_art_url` column in `weeks` table
  - Store high-res album artwork URLs
  - Display in admin dashboard
  - Include in email preview as HTML option

**Benefits**:
- Eliminate manual data entry
- Always accurate album information
- Beautiful album artwork in emails
- Direct Spotify links for participants

---

### 2.3 UX Enhancements

#### Admin Dashboard
- [ ] Add album artwork thumbnails in week preview
- [ ] Bulk import participants from CSV
- [ ] Export reviews to CSV/JSON
- [ ] Week history view (browse past weeks)
- [ ] Copy previous week's data (duplicate week feature)
- [ ] Dark mode toggle
- [ ] Toast notifications instead of inline feedback

#### Review Submission Form
- [ ] Show album artwork on submission page
- [ ] Add "Listen on Spotify" buttons
- [ ] Save draft reviews to localStorage
- [ ] Email reminder integration (optional)
- [ ] Previous submissions history for user
- [ ] Star rating UI (visual alternative to numeric input)

#### Email Preview
- [ ] HTML email template option (with album art)
- [ ] Markdown formatting support in reviews
- [ ] One-click copy formatted HTML
- [ ] Preview toggle (plain text / HTML)
- [ ] Include submission form link in email

---

## Phase 3: Advanced Features

### 3.1 Analytics Dashboard
- [ ] Review statistics over time
  - Average ratings per participant
  - Most/least popular albums
  - Participation trends
- [ ] Charts and visualizations
  - Rating distribution histograms
  - Participation rate over weeks
  - Genre preferences
- [ ] Leaderboard
  - Most consistent reviewers
  - Highest rated albums of all time
  - Participation streaks

### 3.2 Social Features
- [ ] Comment on other reviews
- [ ] Like/upvote favorite tracks
- [ ] Participant profiles
  - Favorite genres
  - Top rated albums
  - Review history
- [ ] Recommendation engine
  - "Based on your ratings, you might like..."
  - Similar participants feature

### 3.3 Automation
- [ ] Scheduled email sending (SendGrid/Resend integration)
- [ ] Automatic reminder emails before deadline
- [ ] Slack/Discord bot integration
- [ ] Weekly digest automation

### 3.4 Mobile App
- [ ] React Native mobile app
- [ ] Push notifications for new weeks
- [ ] Quick rate and review interface
- [ ] Offline mode with sync

---

## Phase 4: Platform Enhancements

### 4.1 Multi-Club Support
- [ ] Create `clubs` table
- [ ] Allow users to create/join multiple clubs
- [ ] Club-specific settings and branding
- [ ] Club admin roles and permissions

### 4.2 Authentication & User Accounts
- [ ] Supabase Auth integration
- [ ] Email/password signup
- [ ] Social login (Google, Spotify)
- [ ] Password reset flow
- [ ] Profile management

### 4.3 Premium Features
- [ ] Custom club domains
- [ ] Extended history (unlimited weeks)
- [ ] Advanced analytics
- [ ] Custom branding/themes
- [ ] API access for integrations

---

## Immediate Next Steps (Recommended Priority)

### Week 1: Spotify Integration
**Why First**: Biggest immediate UX improvement, reduces manual work significantly

1. Set up Spotify Developer account
2. Implement search functionality
3. Add auto-populate to admin dashboard
4. Store album artwork URLs

### Week 2: Rolling Stone 500 Import
**Why Second**: Complements Spotify integration, streamlines classic album selection

1. Create `rs_500_albums` migration
2. Build import script with Spotify metadata
3. Add RS 500 picker to admin
4. Track usage to prevent duplicates

### Week 3: UX Polish
**Why Third**: Makes existing features more delightful to use

1. Add album artwork to submission form
2. Implement bulk participant import
3. Add week history browser
4. HTML email template option

---

## Technical Debt & Infrastructure

### Testing
- [ ] Set up Vitest for unit tests
- [ ] Add E2E tests with Playwright
- [ ] API endpoint testing
- [ ] Database migration testing

### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Component storybook
- [ ] User guide for participants
- [ ] Admin guide with screenshots

### Performance
- [ ] Implement React Query for data caching
- [ ] Add Redis caching layer
- [ ] Optimize database queries
- [ ] Image optimization (Next.js Image component)
- [ ] Lazy loading for long participant lists

### Security
- [ ] Add rate limiting to API routes
- [ ] Implement CSRF protection
- [ ] Add input sanitization
- [ ] Security audit of RLS policies
- [ ] Regular dependency updates

---

## Community & Growth

### Marketing
- [ ] Create demo video
- [ ] Blog post about building the app
- [ ] Submit to Product Hunt
- [ ] Create Twitter/social presence
- [ ] Build landing page with features

### Open Source
- [ ] Clean up code for public release
- [ ] Add contribution guidelines
- [ ] Create issue templates
- [ ] Set up GitHub Actions CI/CD
- [ ] Add LICENSE file

---

## Resources Needed

### APIs & Services
- **Spotify Web API**: Free (rate limits apply)
- **SendGrid/Resend**: Free tier available for email automation
- **Supabase**: Current free tier sufficient for now
- **Vercel**: Current free tier sufficient

### Data Sources
- **Rolling Stone 500 List**: Publicly available, needs scraping/formatting
- **Album Artwork**: Via Spotify API (high quality)
- **Genre Data**: Via Spotify API or MusicBrainz

---

## Success Metrics

### User Engagement
- Average reviews per week
- Participant retention rate
- Time to submit review (should decrease with UX improvements)
- Email open rates

### Technical Performance
- Page load times < 2s
- API response times < 500ms
- 99.9% uptime
- Zero data loss incidents

### Growth
- Number of active clubs
- Total participants across all clubs
- Reviews submitted per month
- User satisfaction (NPS score)

---

## Notes

- Focus on features that reduce friction and manual work
- Prioritize data integrity and user privacy
- Keep the core experience simple and delightful
- Maintain backward compatibility during migrations
- Always have a rollback plan for major changes

---

**Last Updated**: 2025-11-30
**Version**: 1.0 → 2.0 Roadmap
**Maintainer**: Mike Leikin
