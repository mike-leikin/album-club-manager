# Participant Dashboard

## Overview

The participant dashboard allows authenticated users to view and manage their album review history. This feature was implemented as part of v2.2 to enhance the non-admin participant experience.

## Features

### 1. Personal Review History
- View all submitted reviews organized by week
- Display album artwork, details, and ratings
- See both contemporary and classic album reviews side-by-side

### 2. Browse Community Reviews
- Past weeks appear below the current week as expandable sections
- Expand weeks on demand; review data loads lazily
- Past weeks are read-only (no edit/delete actions)

### 3. Participation Statistics
- **Total Reviews**: Count of all reviews submitted
- **Participation Rate**: Percentage of weeks reviewed out of total weeks
- **Average Ratings**: Separate averages for contemporary and classic albums
- **Review Breakdown**: Count of contemporary vs classic reviews

### 4. Review Editing
- Edit ratings (0-10 scale)
- Update favorite track
- Modify review text
- Real-time validation and saving

### 5. Review Management
- Delete reviews with confirmation dialog
- Changes update statistics immediately
- Preserves review history integrity

## Routes

### Dashboard Page
- **URL**: `/dashboard`
- **Access**: Authenticated users only (not curator-only)
- **Redirect**: Unauthenticated users redirect to `/login?redirect=/dashboard`

### API Endpoints

#### GET `/api/my-reviews`
Fetch all reviews for the authenticated user with statistics.

**Response:**
```json
{
  "data": {
    "reviews": [
      {
        "id": "uuid",
        "week_number": 1,
        "album_type": "contemporary",
        "rating": 8.5,
        "favorite_track": "Track Name",
        "review_text": "Review content...",
        "created_at": "timestamp",
        "updated_at": "timestamp",
        "week": {
          "week_number": 1,
          "contemporary_title": "Album Title",
          "contemporary_artist": "Artist Name",
          "contemporary_album_art_url": "url",
          // ... full week data
        }
      }
    ],
    "stats": {
      "totalReviews": 10,
      "contemporaryCount": 5,
      "classicCount": 5,
      "avgContemporaryRating": 7.8,
      "avgClassicRating": 8.2,
      "participationRate": 83,
      "totalWeeks": 6
    }
  }
}
```

#### PATCH `/api/reviews/[id]`
Update a specific review (users can only update their own reviews).

**Request Body:**
```json
{
  "rating": 9.0,
  "favorite_track": "New Track",
  "review_text": "Updated review..."
}
```

**Security:**
- Validates user owns the review
- Requires authentication
- Returns 404 if review not found or user doesn't have permission

#### DELETE `/api/reviews/[id]`
Delete a specific review (users can only delete their own reviews).

**Security:**
- Validates user owns the review
- Requires authentication
- Confirmation dialog in UI before deletion

## Authentication Flow

1. User visits `/dashboard`
2. Middleware checks for active session
3. If not authenticated → redirect to `/login?redirect=/dashboard`
4. If authenticated → load dashboard with user's reviews
5. On login success → redirect to `/dashboard` (all users, including curators)

### Curator Access

Curators have access to both the participant dashboard and admin panel:
- After login, curators are redirected to `/dashboard` like all users
- Curators see an "Admin Panel" button in the dashboard header to access `/admin`
- In the admin panel, curators see a "My Reviews" button to return to `/dashboard`
- This allows curators to both manage the club AND submit their own reviews

## User Experience

### Empty State
When a participant has no reviews yet:
- Clear message explaining they haven't submitted reviews
- Direct link to `/submit` page
- Encourages first review submission

### Loaded State
When reviews exist:
- Statistics cards at the top showing key metrics
- Reviews grouped by week in reverse chronological order
- Each week shows both contemporary and classic reviews side-by-side
- Visual album art and metadata for context

### Past Week Reviews
When scrolling past the current week:
- Weeks are listed in reverse chronological order
- Each week expands to show approved reviews for that week
- Past weeks are read-only (no edit/delete actions)

### Editing Flow
1. Click "Edit" button on any review card
2. Form appears inline with current values pre-populated
3. Make changes to rating, favorite track, or review text
4. Click "Save Changes" to update
5. Success toast confirmation
6. Statistics update automatically

### Delete Flow
1. Click "Delete" button on any review card
2. Browser confirmation dialog appears
3. Confirm deletion
4. Review removed from database
5. Success toast confirmation
6. UI updates to remove the review card

## Technical Implementation

### Authentication
- Uses existing Supabase Auth system
- Session management via cookies
- Auto-links participant records to auth accounts via `auth_user_id`

### Authorization
- All API routes use `requireAuth()` helper
- Server-side participant validation ensures users only access their own data
- Row Level Security (RLS) policies enforce database-level permissions

### State Management
- Client-side React state for UI interactions
- Optimistic UI updates for better UX
- Re-fetch after mutations to ensure data consistency

### Error Handling
- Toast notifications for all user actions
- Graceful error messages for API failures
- Loading states during async operations

## Future Enhancements

Potential improvements (from NEXT_STEPS.md):

1. **Draft Reviews**
   - Auto-save draft reviews
   - Save partial reviews and complete later

2. **Review History & Audit Trail**
   - Track edit history
   - Show when reviews were last modified

3. **Enhanced Statistics**
   - Charts and graphs for rating trends over time
   - Comparison to group averages
   - Personal taste profile analysis

4. **Social Features**
   - Compare ratings with other participants
   - See who else reviewed the same albums
   - Discussion threads per album

## Migration Notes

No database migrations required - this feature uses existing schema:
- `participants` table (with `auth_user_id` linking)
- `reviews` table (existing structure)
- `weeks` table (for album metadata)

All necessary columns and relationships already exist from v2.1 authentication implementation.
