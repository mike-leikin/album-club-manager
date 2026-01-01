import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockParticipant } from '@/tests/mocks/factories/participantFactory'
import { createMockReview } from '@/tests/mocks/factories/reviewFactory'

// Mock the Supabase client module
vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

// Import after mocking
import { POST } from '@/app/api/reviews/submit/route'
import { createServerClient } from '@/lib/supabaseClient'

// Get the mocked function
const mockCreateServerClient = vi.mocked(createServerClient)

describe('POST /api/reviews/submit', () => {
  let mockSupabase: any
  let mockParticipant: ReturnType<typeof createMockParticipant>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a fresh mock participant for each test
    mockParticipant = createMockParticipant({
      id: 'test-participant-1',
      name: 'Test User',
      email: 'test@example.com',
    })

    // Create mock Supabase client with proper chaining
    // The trick: all methods return the mock object for chaining,
    // except single() and the final select() which return promises
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    }

    // Mock the createServerClient to return our mock
    mockCreateServerClient.mockReturnValue(mockSupabase)
  })

  describe('Successful submissions', () => {
    it('submits review for contemporary album only', async () => {
      // First call: participant lookup chain
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      // Second call: insert operation - the SECOND .select() call should resolve
      const mockReview = createMockReview({
        id: 'new-review-1',
        week_number: 1,
        participant_id: mockParticipant.id,
        album_type: 'contemporary',
        rating: 8.5,
        favorite_track: 'Track 1',
        review_text: 'Great album!',
      })

      // Mock select to return mockSupabase for first call (in participant lookup),
      // then return promise for second call (after insert)
      mockSupabase.select
        .mockReturnValueOnce(mockSupabase) // First call: participant lookup
        .mockResolvedValueOnce({             // Second call: after insert
          data: [mockReview],
          error: null,
        })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          contemporary: {
            rating: 8.5,
            favorite_track: 'Track 1',
            review_text: 'Great album!',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully submitted 1 review(s)')
      expect(data.data).toHaveLength(1)
      expect(data.data[0].album_type).toBe('contemporary')
    })

    it('submits review for classic album only', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const mockReview = createMockReview({
        id: 'new-review-2',
        week_number: 2,
        participant_id: mockParticipant.id,
        album_type: 'classic',
        rating: 7.0,
        favorite_track: 'Classic Hit',
        review_text: 'Solid classic',
      })

      mockSupabase.select
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({
          data: [mockReview],
          error: null,
        })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 2,
          participant_email: 'test@example.com',
          classic: {
            rating: 7.0,
            favorite_track: 'Classic Hit',
            review_text: 'Solid classic',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully submitted 1 review(s)')
      expect(data.data).toHaveLength(1)
      expect(data.data[0].album_type).toBe('classic')
    })

    it('submits both contemporary and classic reviews', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const mockReviews = [
        createMockReview({
          id: 'new-review-3',
          week_number: 3,
          participant_id: mockParticipant.id,
          album_type: 'contemporary',
          rating: 9.0,
        }),
        createMockReview({
          id: 'new-review-4',
          week_number: 3,
          participant_id: mockParticipant.id,
          album_type: 'classic',
          rating: 8.0,
        }),
      ]

      mockSupabase.select
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({
          data: mockReviews,
          error: null,
        })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 3,
          participant_email: 'test@example.com',
          contemporary: {
            rating: 9.0,
            favorite_track: 'Best Song',
            review_text: 'Amazing!',
          },
          classic: {
            rating: 8.0,
            favorite_track: 'Timeless',
            review_text: 'Still holds up',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully submitted 2 review(s)')
      expect(data.data).toHaveLength(2)
    })

    it('handles optional fields (favorite_track, review_text)', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const mockReview = createMockReview({
        id: 'new-review-5',
        week_number: 1,
        participant_id: mockParticipant.id,
        album_type: 'contemporary',
        rating: 6.0,
        favorite_track: null,
        review_text: null,
      })

      mockSupabase.select
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({
          data: [mockReview],
          error: null,
        })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          contemporary: {
            rating: 6.0,
            // No favorite_track or review_text
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('trims whitespace from email and text fields', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const mockReview = createMockReview({
        id: 'new-review-6',
        week_number: 1,
        participant_id: mockParticipant.id,
        album_type: 'contemporary',
        rating: 7.5,
      })

      mockSupabase.select
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({
          data: [mockReview],
          error: null,
        })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: '  TEST@EXAMPLE.COM  ', // Whitespace and uppercase
          contemporary: {
            rating: 7.5,
            favorite_track: '  Track Name  ',
            review_text: '  Review text  ',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Verify .eq was called with lowercase trimmed email
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@example.com')
    })
  })

  describe('Validation errors', () => {
    it('returns 400 when week_number is missing', async () => {
      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          participant_email: 'test@example.com',
          contemporary: {
            rating: 8.0,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid week number is required')
    })

    it('returns 400 when week_number is less than 1', async () => {
      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 0,
          participant_email: 'test@example.com',
          contemporary: {
            rating: 8.0,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid week number is required')
    })

    it('returns 400 when participant_email is missing', async () => {
      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          contemporary: {
            rating: 8.0,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('returns 400 when participant_email is empty string', async () => {
      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: '   ',
          contemporary: {
            rating: 8.0,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('returns 400 when no album reviews provided', async () => {
      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          // No contemporary or classic
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('At least one album review is required')
    })

    it('returns 400 when contemporary rating is invalid (< 0)', async () => {
      // Mock participant lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          contemporary: {
            rating: -1,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Contemporary rating must be between 0 and 10')
    })

    it('returns 400 when contemporary rating is invalid (> 10)', async () => {
      // Mock participant lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          contemporary: {
            rating: 11,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Contemporary rating must be between 0 and 10')
    })

    it('returns 400 when classic rating is invalid (< 0)', async () => {
      // Mock participant lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          classic: {
            rating: -2,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Classic rating must be between 0 and 10')
    })

    it('returns 400 when classic rating is invalid (> 10)', async () => {
      // Mock participant lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          classic: {
            rating: 15,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Classic rating must be between 0 and 10')
    })
  })

  describe('Error handling', () => {
    it('returns 404 when participant not found', async () => {
      // Mock participant lookup with no results
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'nonexistent@example.com',
          contemporary: {
            rating: 8.0,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe(
        'Participant not found. Please check your email address.'
      )
    })

    it('deletes existing reviews before inserting (upsert behavior)', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      const mockReview = createMockReview({
        id: 'new-review-7',
        week_number: 1,
        participant_id: mockParticipant.id,
        album_type: 'contemporary',
        rating: 9.0,
      })

      mockSupabase.select
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({
          data: [mockReview],
          error: null,
        })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          contemporary: {
            rating: 9.0,
          },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify delete was called
      expect(mockSupabase.from).toHaveBeenCalledWith('reviews')
      expect(mockSupabase.delete).toHaveBeenCalled()
    })

    it('returns 500 when database insert fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: mockParticipant.id },
        error: null,
      })

      // Mock insert failure - the error object will be thrown in the route
      mockSupabase.select
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed'),
        })

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          contemporary: {
            rating: 8.0,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Database connection failed')
    })

    it('handles generic errors gracefully', async () => {
      // Mock participant lookup to throw unexpected error
      mockSupabase.single.mockRejectedValueOnce('Unexpected error')

      const request = new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          week_number: 1,
          participant_email: 'test@example.com',
          contemporary: {
            rating: 8.0,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unable to submit reviews')
    })
  })
})
