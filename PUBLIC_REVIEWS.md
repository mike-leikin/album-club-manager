# Public Reviews Feature

**Version 2.4** - Released 2026-01-01

## Overview

The Public Reviews feature provides a dedicated page at `/reviews` where anyone can browse all submitted reviews for weeks that have passed their deadline. Reviews are displayed with full details (ratings, favorite tracks, review text) but show only participants' first names to protect privacy.

## Key Features

### 1. Public Access

**No Authentication Required:**
- Anyone can visit `/reviews` without logging in
- No session or cookies needed
- Fully accessible to all participants and guests

### 2. Privacy Protection

**First Names Only:**
- Reviews show "John" instead of "John Smith"
- Extracted using `getFirstName()` utility function
- Handles edge cases:
  - Single names: "Prince" → "Prince"
  - Empty names: "" → "Anonymous"
  - Multiple spaces: "  John  " → "John"

### 3. Smart Visibility

**Deadline-Based Access:**
- Reviews visible only after week's deadline passes
- Current week shows "🔒 Locked" state
- Deadline displayed: "Deadline: March 15, 2026 at 11:59 PM"
- Once deadline passes, week automatically unlocks

**Locked State Message:**
```
🔒 Locked
Reviews locked until deadline
```

### 4. Performance Optimized

**Lazy Loading:**
- All weeks load initially (lightweight metadata only)
- Reviews fetched only when week is expanded
- Reduces initial page load time
- Improves performance for users with many weeks

**Load Sequence:**
1. Page loads → Fetch all weeks (fast)
2. User clicks week → Fetch reviews for that week only
3. Reviews cached in component state (no re-fetch on collapse/expand)

### 5. Rich UI Features

**Expandable Weeks:**
- Accordion-style interface
- Click any unlocked week to expand
- Collapse by clicking again
- Visual indicator: ▶ (collapsed) / ▼ (expanded)

**Album Grouping:**
- Reviews organized by album type
- Contemporary: Purple accent
- Classic: Orange accent
- Each album shows:
  - Album artwork
  - Artist and title
  - Release year
  - Average rating
  - Review count

**Review Cards:**
Each review displays:
- Participant's first name
- Rating (e.g., "8.5/10")
- Favorite track
- Full review text
- Submission date

## User Interface

### Page Structure

```
┌─────────────────────────────────────────┐
│  🎵 Album Club Reviews                  │
│  Browse past weeks and read what        │
│  others thought                         │
│  [Home]                                 │
├─────────────────────────────────────────┤
│  Week 15 • 🔒 Locked                    │
│  Deadline: March 15, 2026               │
│  [Reviews locked until deadline]        │
├─────────────────────────────────────────┤
│  Week 14 • Ended Feb 28  [▼]            │
│  12 reviews • Avg: 7.8 / 8.2            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ CONTEMPORARY                    │   │
│  │ Artist - Album (Year)           │   │
│  │ Average Rating: 7.8/10 (6 rev)  │   │
│  │                                 │   │
│  │ ┌─────────────────────────┐     │   │
│  │ │ John        8.5/10      │     │   │
│  │ │ Favorite: Track Name    │     │   │
│  │ │ "Great album..."        │     │   │
│  │ └─────────────────────────┘     │   │
│  │                                 │   │
│  │ ┌─────────────────────────┐     │   │
│  │ │ Sarah       7.0/10      │     │   │
│  │ │ ...                     │     │   │
│  │ └─────────────────────────┘     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ CLASSIC                         │   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Visual States

#### Locked Week (Deadline Not Passed)
- Gray background
- "🔒 Locked" badge
- Not clickable
- Message: "Reviews locked until deadline"

#### Unlocked Week (Past Deadline)
- White background
- Clickable with hover effect
- Shows review count and averages when expanded
- Collapse/expand arrow indicator

#### Empty Reviews
- "No reviews submitted for this album yet" message
- Still shows album artwork and metadata

#### No Albums Set
- "No albums configured for this week" message
- Shown when curator hasn't set contemporary or classic album

## Technical Implementation

### Component Architecture

**Main Component: ReviewsPage**
- Manages week list state
- Handles expand/collapse logic
- Coordinates API calls

**Sub-Components:**
1. **WeekSection** - Individual week container
   - Props: week, isLocked, isExpanded, onToggle
   - Displays week header and content

2. **AlbumReviewsSection** - Album-specific reviews
   - Props: albumType, title, artist, year, albumArtUrl, reviewsData
   - Shows album info and review list

3. **ReviewCard** - Individual review display
   - Props: review (with participant info)
   - Uses `getFirstName()` to show first name only

### API Endpoints Used

**1. GET `/api/weeks?all=true`**
- Returns all weeks ordered by week_number DESC
- Response: `{ data: Week[] }`
- Called once on page load

**2. GET `/api/reviews?week_number={n}`**
- Returns reviews for specific week
- Response: `{ data: { contemporary: AlbumReviews, classic: AlbumReviews } }`
- Called when week is expanded

### Data Flow

```typescript
// 1. Page load - fetch all weeks
const response = await fetch("/api/weeks?all=true");
const weeks = response.data; // Array of Week objects

// 2. User clicks week - check if locked
function toggleWeek(weekNumber: number) {
  const week = weeks.find(w => w.week_number === weekNumber);
  if (isWeekLocked(week)) return; // Don't allow expanding locked weeks

  // Load reviews if not already loaded
  if (!week.reviewsData) {
    loadWeekReviews(weekNumber);
  }
}

// 3. Fetch reviews for expanded week
async function loadWeekReviews(weekNumber: number) {
  const response = await fetch(`/api/reviews?week_number=${weekNumber}`);
  const reviewsData = response.data;
  // Store in component state
}

// 4. Display reviews with first names
reviews.map(review => (
  <ReviewCard
    key={review.id}
    review={{
      ...review,
      participant: {
        ...review.participant,
        displayName: getFirstName(review.participant.name)
      }
    }}
  />
))
```

### First Name Utility

**File:** `lib/utils/names.ts`

```typescript
export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) {
    return 'Anonymous';
  }
  const nameParts = fullName.trim().split(/\s+/);
  return nameParts[0];
}
```

**Examples:**
- `getFirstName("John Doe")` → "John"
- `getFirstName("Mary Jane Smith")` → "Mary"
- `getFirstName("Prince")` → "Prince"
- `getFirstName("")` → "Anonymous"
- `getFirstName("  John  ")` → "John"

### Deadline Logic

```typescript
function isWeekLocked(week: Week): boolean {
  if (!week.response_deadline) return false; // No deadline = always unlocked
  return new Date(week.response_deadline) > new Date(); // Future deadline = locked
}
```

## Navigation

### Entry Points

**From Dashboard:**
- "Browse Reviews" button in header (next to "Home" and "Admin Panel")
- Visible to all authenticated users

**From Home Page:**
- "Browse reviews" link under main call-to-action
- Visible to everyone (public)

**Direct URL:**
- `https://albumclub.club/reviews`
- `http://localhost:3000/reviews` (development)

## User Workflows

### Scenario 1: Guest Browsing Past Weeks

1. User visits home page or `/reviews` directly
2. Sees list of all weeks
3. Current week shows locked with deadline info
4. Clicks on Week 14 (past deadline)
5. Week expands showing both albums
6. Sees all reviews with first names, ratings, and text
7. Can collapse and expand other weeks

### Scenario 2: Participant Checking Others' Reviews

1. Participant submits their reviews for Week 15
2. Clicks "Browse Reviews" in dashboard
3. Sees Week 15 is locked until deadline
4. Browses previous weeks (14, 13, 12...)
5. Reads what others thought about same albums
6. Discovers different perspectives and favorite tracks

### Scenario 3: Curator Checking Engagement

1. Curator reviews Week 14's reviews after deadline
2. Sees average ratings for both albums
3. Checks how many participants submitted (review count)
4. Reads individual reviews to gauge reception
5. Uses insights to plan future album selections

## Edge Cases Handled

1. **No weeks exist** → Empty state: "No weeks have been created yet. Check back soon!"

2. **Week with no reviews** → "No reviews submitted for this album yet"

3. **Week with only one album type** → Other album section doesn't render

4. **No deadline set** → Week is always unlocked (treated as past deadline)

5. **Deleted participants** → Review shows name from when submitted (preserved in database)

6. **Empty review text** → Shows rating and favorite track only

7. **API errors** → "Failed to load reviews" message with error logged to console

8. **Long review text** → `whitespace-pre-wrap` preserves formatting, scrollable if needed

## Performance Considerations

### Initial Load
- Only week metadata fetched (lightweight query)
- No reviews loaded until needed
- Fast page load even with 50+ weeks

### On-Demand Loading
```typescript
// Reviews fetched only when expanded
const handleWeekExpand = async (weekNumber: number) => {
  if (!reviewsCache[weekNumber]) {
    const data = await fetch(`/api/reviews?week_number=${weekNumber}`);
    setReviewsCache(prev => ({ ...prev, [weekNumber]: data }));
  }
};
```

### Caching Strategy
- Fetched reviews stored in component state
- No re-fetch when collapsing and re-expanding same week
- Cache cleared on page refresh (intentional)

### Optimization Opportunities (Future)
- Add server-side caching (Redis or similar)
- Implement pagination if weeks > 50
- Pre-fetch reviews for most recent 3 weeks
- Add loading skeletons for better perceived performance

## Security & Privacy

### Privacy Protection
- **First names only**: Full names never exposed in UI
- **Server-side data**: Full names remain in database for admin use
- **Client-side transformation**: `getFirstName()` runs in browser

### Public Access
- No authentication required
- No rate limiting (consider adding if abuse occurs)
- No user tracking or analytics

### Data Exposure
- Reviews visible only after deadline (enforced client-side)
- All participants' reviews equally visible (no hiding)
- Email addresses never exposed

**Note:** Deadline enforcement is client-side only. If needed, add server-side enforcement in `/api/reviews` to prevent API access before deadline.

## Future Enhancements

### Search & Filtering
- Search by participant name
- Filter by rating range (e.g., 8-10 only)
- Filter by album type (contemporary/classic)
- Search review text content

### Sorting Options
- Sort reviews by highest/lowest rating
- Sort by most recent first
- Sort alphabetically by participant name

### Social Features
- "Favorite" reviews bookmark system
- Share specific review via URL
- Comment/reply on reviews (discussion thread)

### Export Features
- Export week's reviews as PDF
- Download all reviews as CSV
- Print-friendly view

### Enhanced UI
- Pagination for weeks (if history grows large)
- Infinite scroll instead of expand/collapse
- Participant profile pages (click name to see all their reviews)
- Album detail pages (all weeks that covered this album)

### Analytics
- "Most controversial album" (highest rating variance)
- "Hidden gems" (low average but passionate reviews)
- Participant taste profiles (preferred genres, rating tendencies)

## Testing Notes

**Manual Testing Checklist:**
- ✅ Page loads with all weeks
- ✅ Current week shows locked state
- ✅ Past weeks are expandable
- ✅ Reviews load when week expanded
- ✅ First names extracted correctly
- ✅ Average ratings calculated correctly
- ✅ Review counts accurate
- ✅ Album artwork displays
- ✅ Empty states handled gracefully
- ✅ Mobile responsive design works
- ✅ Navigation links functional
- ✅ Loading states appear

**Test Cases:**
1. Visit `/reviews` without authentication
2. Expand and collapse multiple weeks
3. Test with week that has no reviews
4. Test with week missing contemporary or classic album
5. Test with participant who has single-word name
6. Test on mobile device (responsive layout)
7. Test with very long review text (formatting preserved)

## Deployment

**No Database Changes Required:**
- Uses existing tables (weeks, reviews, participants)
- No migrations needed
- Fully backwards compatible

**Deployment Steps:**
1. Deploy code to production
2. Feature works immediately
3. No configuration needed

**Environment Variables:**
- None required (uses existing Supabase config)

## Support

**Common Questions:**

**Q: Why can't I see reviews for the current week?**
A: Reviews are locked until the week's deadline passes to prevent influencing others' opinions before they submit.

**Q: Why are only first names shown?**
A: To protect participants' privacy while maintaining accountability and authenticity.

**Q: Can I see my own full name?**
A: No, the reviews page shows first names for everyone equally. Your full name is visible in your personal dashboard.

**Q: How do I know when reviews will unlock?**
A: The deadline is displayed on each locked week. Once that date/time passes, the week unlocks automatically.

**Q: Can I search for specific reviews?**
A: Not currently, but search functionality is planned for a future release.

**Q: Are deleted participants' reviews still visible?**
A: Yes, reviews are preserved even if a participant is deleted. The review shows the name they had at the time of submission.

---

**Questions or Issues?** Contact the curator or file an issue at the project repository.
