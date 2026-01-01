import { createMockReview } from '../factories/reviewFactory'

export const mockReviews = [
  createMockReview({
    id: 'review-1',
    week_number: 1,
    participant_id: 'participant-1',
    album_type: 'contemporary',
    rating: 8.5,
    favorite_track: 'Opening Track',
    review_text: 'Great album!',
  }),
  createMockReview({
    id: 'review-2',
    week_number: 1,
    participant_id: 'participant-1',
    album_type: 'classic',
    rating: 7.0,
    favorite_track: 'Classic Hit',
    review_text: 'Solid classic',
  }),
]
