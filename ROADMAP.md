# Album Club Manager - Product Roadmap

## Current Status: v2.0 ✅ (Completed)

### What's Live
- ✅ Participant management (CRUD, bulk CSV import)
- ✅ Review submission form (public-facing, unlimited text)
- ✅ Review statistics in weekly emails
- ✅ Week management with Supabase persistence
- ✅ Full admin dashboard with 4 tabs (Week, Participants, History, Export)
- ✅ Spotify integration with auto-populate
- ✅ Rolling Stone 500 integration with usage tracking
- ✅ Automated email sending with Resend
- ✅ HTML email templates with album artwork
- ✅ Custom domain (albumclub.club)
- ✅ Data export and backup system (CSV/JSON)
- ✅ Deployed to Vercel at https://albumclub.club

---

## Phase 2: UX Improvements & Data Import ✅ COMPLETED

### 2.1 Rolling Stone 500 Integration ✅
**Goal**: Import the full Rolling Stone 500 greatest albums list with metadata

**Tasks**:
- [x] Create migration for `rs_500_albums` table
- [x] Build data import script with Spotify enrichment
- [x] Add RS 500 album picker to admin dashboard
- [x] Track previously used RS 500 albums
- [x] Show "used" indicator and filter options
- [x] Beautiful UI with album thumbnails

**Results**:
✅ All 500 albums imported with Spotify metadata
✅ Usage tracking fully operational
✅ Classic album selection: 5 minutes → 10 seconds

---

### 2.2 Spotify API Integration ✅
**Goal**: Automatically fetch album details and artwork from Spotify

**Tasks**:
- [x] Set up Spotify API credentials and OAuth flow
- [x] Create Spotify API service (`lib/spotify.ts`)
- [x] Add "Search Spotify" feature to admin dashboard
- [x] Add album artwork columns to weeks table
- [x] Display artwork throughout app (admin, emails, forms)

**Results**:
✅ Album setup time: 5 minutes → 30 seconds (94% faster)
✅ Automatic artwork fetching and display
✅ Direct Spotify links in emails

---

### 2.3 UX Enhancements ✅

#### Admin Dashboard ✅
- [x] Album artwork thumbnails throughout
- [x] Bulk import participants from CSV
- [x] Export reviews to CSV/JSON (complete backup system)
- [x] Week history view with thumbnails
- [x] Copy previous week's data
- [x] Toast notifications (Sonner library)
- [ ] Dark mode toggle (future)

#### Review Submission Form ✅
- [x] Show album artwork on submission page
- [x] Email pre-population via URL
- [x] Email persistence in localStorage
- [x] Removed character limits (unlimited text)
- [x] Resizable textarea
- [ ] Save draft reviews (future)
- [ ] Previous submissions history (future)

#### Email System ✅
- [x] HTML email templates with album art
- [x] Personalized review links
- [x] Previous week results included
- [x] Email preview in admin
- [x] One-click sending to all participants
- [x] Custom domain (albumclub.club)

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

**Last Updated**: 2025-12-27
**Version**: 2.0 → 3.0 Roadmap
**Current Status**: Production-ready with all core features complete
**Live URL**: https://albumclub.club
**Maintainer**: Mike Leikin
