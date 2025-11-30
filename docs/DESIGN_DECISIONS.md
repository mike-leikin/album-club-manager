# Design Decisions for Album Club v1

This document explains key design choices made for the Album Club application.

## Database Design Philosophy

### Flexible, Low-Pressure Participation

**Decision**: Reviews have no unique constraints on (week_number, participant_id, album_type)

**Rationale**:
- Typical participation rate is ~10% per week
- We don't want to enforce strict "one review per album per person" rules
- Participants should feel free to:
  - Skip weeks entirely
  - Review only one album (contemporary OR classic)
  - Not submit reviews if they didn't have time to listen
- The app is for fun, not compliance

**Implementation**:
- Reviews table has no UNIQUE constraint
- Participants table is separate - you're in the club whether you review or not
- Email distribution includes everyone; review submission is optional
- Results summaries only show reviews from people who participated

### Implicit vs Explicit Participation

**Decision**: No separate "participation" table or tracking

**Rationale**:
- Being a participant means you're in the email list
- Reviewing is a separate, optional action
- Simpler data model: just participants + reviews
- Avoid complexity of tracking "active/inactive" status

### Review Updates and Duplicates

**Decision**: Allow multiple reviews for same album/participant/week (no constraint)

**Current behavior**:
- Participants can submit reviews multiple times
- Latest `created_at` would be considered the "real" one
- Could add upsert logic in the UI layer later if needed

**Alternative considered**: Add UNIQUE constraint and use upsert
- Rejected because: Too strict, adds complexity, and reviews are rare enough that duplicates are unlikely
- Can add this later if it becomes a real problem

## Data Model

### Why Three Tables Instead of More?

**Decision**: Only `weeks`, `participants`, and `reviews`

**Alternatives considered**:
1. **Separate "rounds" table**:
   - Rejected: "week" is simple enough, don't need abstract "round" concept
2. **Separate "albums" table**:
   - Rejected: Album data is fixed per week, no need for normalization
   - Contemporary + classic albums are week-specific selections
3. **"Participation" join table between weeks and participants**:
   - Rejected: Just checking for reviews is sufficient

### Week Number vs Date-Based Keys

**Decision**: Use `week_number` as the primary identifier (1, 2, 3...)

**Rationale**:
- Simple, human-readable
- Easy to reference in emails and URLs
- Sequential nature makes "latest week" queries trivial
- Date ranges can still be stored in `response_deadline` field

**Alternative**: Use ISO week numbers or date ranges
- Rejected: More complex, harder to communicate in emails

## Security & Access

### Row Level Security (RLS) Policies

**Decision**: Public read access to participants and reviews, admin-only writes

**Rationale**:
- Reviews are meant to be shared (that's the whole point!)
- Participant names/emails shown in results summaries
- No sensitive data in reviews table
- Admin writes go through service role (API routes)
- Public writes allowed for review submission (INSERT only)

**Alternative**: Strict per-user access
- Rejected: Overkill for v1, adds auth complexity

### No Authentication for Review Submission (v1)

**Decision**: Review form is public, just asks for participant selection

**Rationale**:
- Small group of trusted friends (~10 people)
- Low stakes (it's album reviews, not banking)
- Reduces friction - no login required
- Can add email verification links later if needed

**Risk mitigation**:
- Form is not publicly discoverable (shared via email only)
- Service role restricts admin operations
- Easy to add auth in v2 if abuse happens

## Performance & Scaling

### Indexes Strategy

**Decision**: Index on common query patterns

**Indexes created**:
- `participants.email` - for quick participant lookup
- `reviews.week_number` - for "get all reviews for a week"
- `reviews.participant_id` - for "get all reviews by a person"
- Composite index on (week_number, participant_id) - for participant's reviews in a week

**Not indexed**:
- `album_type` - small cardinality (only 2 values), not worth it
- Text fields - no full-text search needed for v1

### Caching Strategy (Future)

**Current**: No caching
**Rationale**: Tiny dataset (<100 participants, <20 reviews/week), DB queries are fast enough

**When to add caching**:
- If week stats calculations become slow (unlikely)
- If the app gets public traffic (not planned for v1)

## Future Extensibility

### Fields for Future Features

**Already included**:
- `album_recommendation` - for "what should we listen to next week?"
- `updated_at` triggers - tracks when reviews are edited
- UUID primary keys - future-proof for distributed systems

**Not included yet, easy to add later**:
- User authentication (Supabase Auth)
- Participant "active/inactive" flag
- Review "is_draft" flag
- Email tracking (sent_at, opened_at)
- Album metadata (genre, Spotify embed data)

### Migration Strategy

All schema changes will be:
1. Created as numbered migration files in `supabase/migrations/`
2. Applied manually via Supabase SQL Editor (v1 approach)
3. Could switch to Supabase CLI migrations later

## Technology Choices

### Why Supabase?

**Pros**:
- Managed Postgres (no server management)
- Built-in RLS and auth
- Free tier sufficient for v1
- Real-time subscriptions (if needed later)
- Easy migration path from demo to production

**Alternatives considered**:
- **Airtable/Notion**: Too limited for custom forms
- **Firebase**: Firestore's NoSQL model not ideal for relational reviews data
- **Self-hosted Postgres**: More setup, ongoing maintenance

### Why No ORM?

**Decision**: Use Supabase client directly, no Prisma/Drizzle/etc.

**Rationale**:
- Simple queries don't justify ORM overhead
- Supabase client is already type-safe with our Database types
- Fewer dependencies to maintain
- Direct SQL for complex queries (like stats aggregation)

## Summary

The Album Club v1 data model prioritizes:
1. **Simplicity** - Three tables, clear relationships
2. **Low pressure** - No constraints forcing participation
3. **Flexibility** - Easy to extend without breaking changes
4. **Type safety** - Full TypeScript support via generated types
5. **Developer experience** - Readable schema, good defaults

This design supports the core use case (weekly album sharing and optional reviews) while staying maintainable for a single admin managing a small group of friends.
