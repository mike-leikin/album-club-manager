# Week Lifecycle Enhancement

**Version 2.3** - Released 2026-01-01

## Overview

The Week Lifecycle enhancement transforms the participant dashboard from showing only reviewed weeks to displaying all available weeks, allowing participants to add, edit, and view reviews for any week (past or present) with clear deadline status indicators.

## Key Features

### 1. Enhanced Dashboard View

**Before:** Dashboard only showed weeks where the user had submitted reviews.

**After:** Dashboard shows ALL weeks with:
- **Current Week Section**: Highlighted with green border and "Current" badge
- **Previous Weeks Section**: All past weeks in descending order
- **Empty Review Slots**: "Add Review" buttons for weeks without reviews
- **No Album Set Placeholders**: Clear indicators when curator hasn't configured an album

### 2. Deadline Awareness

**Visual Indicators:**
- ⚠️ **Past Deadline Badge**: Amber warning badge on weeks where deadline has passed
- 🟢 **Current Week Badge**: Green "Current" badge on the active week
- **Deadline Display**: Shows formatted deadline date and time on all weeks

**Submit Form:**
- Displays deadline prominently at the top
- Shows warning banner when deadline has passed
- Still allows submission (non-blocking, informative only)

### 3. Add Reviews to Any Week

Participants can now:
- Add reviews to previous weeks they missed
- Submit late reviews with clear past-deadline warning
- Fill in empty album slots (contemporary or classic)
- See "No album set" when curator hasn't configured an album

### 4. Current Week Detection

**Smart Logic:**
- Current week = Latest week that hasn't passed its deadline
- If all weeks are past deadline → Most recent week is marked current
- If no deadline is set → Week never expires (always current)

## User Interface

### Dashboard Structure

```
┌─────────────────────────────────────────┐
│  📊 Statistics Cards                    │
├─────────────────────────────────────────┤
│  📅 Current Week (Week 15)              │
│  Deadline: March 15, 2026 at 11:59 PM   │
│  ┌────────────┐  ┌────────────┐        │
│  │ Contemp    │  │ Classic    │        │
│  │ [Review]   │  │ [Add]      │        │
│  └────────────┘  └────────────┘        │
├─────────────────────────────────────────┤
│  📚 Previous Weeks                      │
│                                         │
│  Week 14 • ⚠️ Past Deadline             │
│  ┌────────────┐  ┌────────────┐        │
│  │ [No Review]│  │ [Review]   │        │
│  └────────────┘  └────────────┘        │
└─────────────────────────────────────────┘
```

### Visual States

#### Album with Review
- Album artwork and metadata
- Rating, favorite track, review text
- Edit and Delete buttons

#### Empty Review Slot
- Album artwork (slightly faded)
- "No review yet" message
- "Add Review" button

#### No Album Set
- Dashed border placeholder
- "No album set" text
- No action buttons (can't review non-existent album)

#### Past Deadline Warning (when adding review)
```
⚠️ You're submitting past the deadline, but that's okay!
```

## Technical Implementation

### API Changes

**Endpoint:** `GET /api/my-reviews`

**New Response Structure:**
```typescript
{
  data: {
    reviews: ReviewWithWeek[];           // Existing reviews (backwards compatible)
    allWeeks: WeekWithReviewStatus[];    // NEW: All weeks with status
    stats: ReviewStats;
    participant: { name, isCurator };
  }
}
```

**WeekWithReviewStatus Type:**
```typescript
type WeekWithReviewStatus = Week & {
  reviews: {
    contemporary: Review | null;
    classic: Review | null;
  };
  isPastDeadline: boolean;
  isCurrentWeek: boolean;
}
```

### Files Modified

#### Backend
- [/app/api/my-reviews/route.ts](app/api/my-reviews/route.ts) - Enhanced to return all weeks with review status

#### Frontend
- [/app/dashboard/page.tsx](app/dashboard/page.tsx) - Completely restructured with new components
- [/app/submit/page.tsx](app/submit/page.tsx) - Added deadline warning banner

#### Infrastructure
- [/middleware.ts](middleware.ts) - Added development mode bypass for testing

### Helper Functions

```typescript
// Check if deadline has passed
function isPastDeadline(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

// Determine which week is current
function determineCurrentWeek(allWeeks: Week[]): number | null {
  if (allWeeks.length === 0) return null;

  // Find weeks that haven't passed deadline
  const nonPastWeeks = allWeeks.filter(w => !isPastDeadline(w.response_deadline));

  // If there are non-past weeks, return the latest one
  if (nonPastWeeks.length > 0) {
    return Math.max(...nonPastWeeks.map(w => w.week_number));
  }

  // Otherwise, return the most recent week
  return Math.max(...allWeeks.map(w => w.week_number));
}
```

## Development Mode

For local testing without authentication:

**URL Pattern:**
```
http://localhost:3000/dashboard?dev=true&email=participant@example.com
```

**How it works:**
1. `?dev=true` - Bypasses authentication middleware (development only)
2. `&email=` - API looks up participant by email instead of auth session
3. Works exactly like production, but without needing magic link authentication

**Security:** This bypass ONLY works when `NODE_ENV=development`. In production, proper authentication is always required.

## User Workflows

### Scenario 1: Regular Week Participation

1. User receives email notification for Week 15
2. Clicks personalized link → lands on submit form
3. Sees deadline prominently displayed
4. Submits reviews for both albums
5. Redirected to dashboard (if authenticated)
6. Sees Week 15 in "Current Week" section with submitted reviews

### Scenario 2: Catching Up on Missed Weeks

1. User logs into dashboard
2. Sees "Previous Weeks" section with Week 12, 13, 14
3. Week 12 shows "⚠️ Past Deadline" badge
4. Clicks "Add Review" on Week 12's contemporary album
5. Sees warning: "You're submitting past the deadline, but that's okay!"
6. Submits review successfully
7. Review appears immediately in Week 12's card

### Scenario 3: Week with Partial Albums

1. Curator only sets contemporary album for Week 10 (no classic)
2. User sees Week 10 with:
   - Contemporary slot: Album with "Add Review" button
   - Classic slot: "No album set" placeholder (dashed border)
3. User can only add review for contemporary album

## Edge Cases Handled

1. **No weeks exist yet** → Empty state message
2. **All weeks past deadline** → Most recent week still marked "Current"
3. **No deadline set** → Week never expires (no warning shown)
4. **User has zero reviews** → All weeks show "Add Review" buttons
5. **Week with only 1 album type** → Other slot shows "No album set"

## Design Decisions

### Why Allow Late Submissions?

**Decision:** Show warnings but don't block submissions after deadline.

**Rationale:**
- Encourages participation over strict enforcement
- Some participants may join late
- Allows catching up on missed weeks
- Curator can decide policy separately

**Future Enhancement:** Could add hard deadline enforcement as optional feature.

### Why Show All Weeks?

**Decision:** Display all weeks, not just weeks with reviews.

**Rationale:**
- Increases visibility of participation gaps
- Encourages filling in missed weeks
- Shows full club history
- Makes it easier to discover past albums

### Why Separate Current/Previous?

**Decision:** Split dashboard into two sections.

**Rationale:**
- Makes current week immediately visible
- Reduces cognitive load (most users care about current week)
- Clear visual hierarchy
- Green highlight draws attention to active week

## Statistics Impact

**No changes to statistics calculation:**
- Participation rate still based on unique weeks reviewed vs. total weeks
- Average ratings still calculated correctly
- Statistics update immediately when reviews added/edited/deleted

## Future Enhancements

Potential additions in future versions:

1. **Hard Deadline Enforcement**
   - Block submissions after deadline (curator-configurable)
   - Lock past weeks from editing

2. **Week States**
   - Draft (not yet published)
   - Active (accepting reviews)
   - Closed (past deadline, read-only)
   - Archived (hidden from main view)

3. **Email Reminders**
   - Automated reminders 24 hours before deadline
   - Automated reminders 1 hour before deadline
   - Reminder emails for missed weeks

4. **Pagination**
   - If club history grows beyond ~50 weeks
   - "Load More" or page numbers
   - Virtual scrolling for performance

5. **Timezone Handling**
   - Per-participant timezone settings
   - Display deadlines in user's local time
   - Server uses UTC for all calculations

## Testing Notes

**Manual Testing Checklist:**
- ✅ Dashboard shows all weeks (not just reviewed ones)
- ✅ Current week has green border and badge
- ✅ Past deadline shows amber warning badge
- ✅ Can add review to previous week
- ✅ Can add review to week past deadline
- ✅ Warning message appears when submitting past deadline
- ✅ "No album set" appears for missing albums
- ✅ Statistics calculate correctly
- ✅ Edit/delete still work on existing reviews
- ✅ Submit form shows deadline warning when past due

**Development Mode Testing:**
```bash
# Test with different participant emails
http://localhost:3000/dashboard?dev=true&email=user1@test.com
http://localhost:3000/dashboard?dev=true&email=user2@test.com
http://localhost:3000/dashboard?dev=true&email=curator@test.com
```

## Rollout Notes

**Database Changes:** None required - uses existing schema

**Migration Required:** No

**Breaking Changes:** None - fully backwards compatible

**Deployment Steps:**
1. Deploy code to production
2. No database migrations needed
3. Feature works immediately for all users
4. Existing reviews and functionality unchanged

## Support

**Common Questions:**

**Q: Can I still submit reviews after the deadline?**
A: Yes! You'll see a warning that you're past the deadline, but submission is allowed.

**Q: Why do some weeks show "No album set"?**
A: The curator hasn't configured an album for that type (contemporary or classic) for that week.

**Q: How do I know which week is current?**
A: The current week has a green border and "Current" badge at the top of the dashboard.

**Q: Can I edit reviews from previous weeks?**
A: Yes! Click "Edit" on any review, make changes, and save. You can also delete reviews.

**Q: What if I missed several weeks?**
A: You can scroll through "Previous Weeks" and add reviews to any week you missed. You'll see a past-deadline warning, but can still submit.

---

**Questions or Issues?** Contact the curator or file an issue at [GitHub Issues](https://github.com/anthropics/claude-code/issues)
