import type { Review } from '@/lib/types/database'

let reviewIdCounter = 0

export function createMockReview(overrides?: Partial<Review>): Review {
  reviewIdCounter++
  const {
    moderation_status = 'approved',
    moderated_at = null,
    moderated_by = null,
    moderation_notes = null,
    ...rest
  } = overrides ?? {}
  return {
    id: `review-${reviewIdCounter}`,
    week_number: 1,
    participant_id: 'participant-1',
    album_type: 'contemporary',
    rating: 7.5,
    favorite_track: 'Test Track',
    review_text: 'This is a test review',
    album_recommendation: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    moderation_status,
    moderated_at,
    moderated_by,
    moderation_notes,
    ...rest,
  }
}

export function resetReviewCounter() {
  reviewIdCounter = 0
}
