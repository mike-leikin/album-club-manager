import type { Review } from '@/lib/types/database'

let reviewIdCounter = 0

export function createMockReview(overrides?: Partial<Review>): Review {
  reviewIdCounter++
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
    ...overrides,
  }
}

export function resetReviewCounter() {
  reviewIdCounter = 0
}
