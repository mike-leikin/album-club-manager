import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockParticipant } from '@/tests/mocks/factories/participantFactory'
import { createMockReview } from '@/tests/mocks/factories/reviewFactory'
import { createMockWeek } from '@/tests/mocks/factories/weekFactory'

// Mock all dependencies
vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => ({
  requireAuth: vi.fn(),
}))

// Import after mocking
import { GET } from '@/app/api/my-reviews/route'
import { createServerClient } from '@/lib/supabaseClient'
import { requireAuth } from '@/lib/auth/utils'
import type { UserSession } from '@/lib/auth/utils'

const mockCreateServerClient = vi.mocked(createServerClient)
const mockRequireAuth = vi.mocked(requireAuth)

describe('My Reviews API', () => {
  type MockSupabase = {
    from: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
    not: ReturnType<typeof vi.fn>
  }
  type ApiWeek = {
    week_number: number
    isCurrentWeek: boolean
    isPastDeadline: boolean
    reviews: {
      contemporary: { rating: number } | null
      classic: { rating: number } | null
    }
  }
  type ApiStats = {
    totalReviews: number
    contemporaryCount: number
    classicCount: number
    avgContemporaryRating: number | null
    avgClassicRating: number | null
    participationRate: number
    totalWeeks: number
  }
  type ApiResponse = {
    data: {
      participant: { name: string; isCurator: boolean }
      stats: ApiStats
      allWeeks: ApiWeek[]
    }
    error?: string
    details?: string
  }
  type ApiErrorResponse = {
    error: string
    details?: string
  }

  let mockSupabase: MockSupabase

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }

    mockCreateServerClient.mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createServerClient>
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Authentication', () => {
    it('returns 401 when not authenticated in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      mockRequireAuth.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = new Request('http://localhost/api/my-reviews', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when authenticated user has no participant record', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      const session: UserSession = {
        user: { id: 'auth-user-1', email: 'user@test.com' },
        isCurator: false,
      }

      mockRequireAuth.mockResolvedValueOnce(session)

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows found' },
      })

      const request = new Request('http://localhost/api/my-reviews', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain('Participant not found')
      expect(data.details).toContain('user@test.com')
    })
  })

  describe('Development mode', () => {
    it('allows email parameter in development mode', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'dev@test.com',
        name: 'Dev User',
        is_curator: false,
      })

      // Mock participant lookup by email
      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null }) // Participant lookup
        .mockResolvedValueOnce({ data: [], error: null }) // Reviews query
        .mockResolvedValueOnce({ data: [], error: null }) // All weeks query

      mockSupabase.order
        .mockResolvedValueOnce({ data: [], error: null }) // Reviews order
        .mockResolvedValueOnce({ data: [], error: null }) // All weeks order

      const request = new Request('http://localhost/api/my-reviews?email=dev@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)
      expect(data.data.participant.name).toBe('Dev User')

      // Verify participant was looked up by email, not auth_user_id
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'dev@test.com')
      expect(mockRequireAuth).not.toHaveBeenCalled()
    })

    it('returns 404 when development email not found', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows found' },
      })

      const request = new Request('http://localhost/api/my-reviews?email=nonexistent@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain('Participant not found')
      expect(data.details).toContain('nonexistent@test.com')
    })
  })

  describe('Statistics calculation', () => {
    it('calculates statistics correctly', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'stats@test.com',
        name: 'Stats User',
        is_curator: false,
      })

      const week1 = createMockWeek({
        week_number: 1,
        response_deadline: '2024-01-01T00:00:00Z',
      })

      const week2 = createMockWeek({
        week_number: 2,
        response_deadline: '2024-01-08T00:00:00Z',
      })

      const week3 = createMockWeek({
        week_number: 3,
        response_deadline: '2024-01-15T00:00:00Z',
      })

      const reviews = [
        createMockReview({
          id: 'review-1',
          participant_id: 'participant-1',
          week_number: 1,
          album_type: 'contemporary',
          rating: 8.5,
        }),
        createMockReview({
          id: 'review-2',
          participant_id: 'participant-1',
          week_number: 1,
          album_type: 'classic',
          rating: 9.0,
        }),
        createMockReview({
          id: 'review-3',
          participant_id: 'participant-1',
          week_number: 2,
          album_type: 'contemporary',
          rating: 7.5,
        }),
      ]

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null }) // Participant lookup

      mockSupabase.order
        .mockResolvedValueOnce({ data: reviews, error: null }) // Reviews
        .mockResolvedValueOnce({ data: [week3, week2, week1], error: null }) // All weeks

      mockSupabase.in.mockResolvedValueOnce({
        data: [week1, week2],
        error: null,
      }) // Weeks for reviews

      const request = new Request('http://localhost/api/my-reviews?email=stats@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)
      expect(data.data.stats).toEqual({
        totalReviews: 3,
        contemporaryCount: 2,
        classicCount: 1,
        avgContemporaryRating: 8.0, // (8.5 + 7.5) / 2 = 8.0
        avgClassicRating: 9.0,
        participationRate: 67, // 2 out of 3 weeks = 67%
        totalWeeks: 3,
      })
    })

    it('handles zero reviews correctly', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'empty@test.com',
        name: 'Empty User',
        is_curator: false,
      })

      const week1 = createMockWeek({
        week_number: 1,
        response_deadline: '2024-01-01T00:00:00Z',
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null }) // Participant lookup

      mockSupabase.order
        .mockResolvedValueOnce({ data: [], error: null }) // No reviews
        .mockResolvedValueOnce({ data: [week1], error: null }) // All weeks

      const request = new Request('http://localhost/api/my-reviews?email=empty@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)
      expect(data.data.stats).toEqual({
        totalReviews: 0,
        contemporaryCount: 0,
        classicCount: 0,
        avgContemporaryRating: null,
        avgClassicRating: null,
        participationRate: 0,
        totalWeeks: 1,
      })
    })

    it('rounds average ratings to 1 decimal place', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'rounding@test.com',
        name: 'Rounding User',
        is_curator: false,
      })

      const week1 = createMockWeek({
        week_number: 1,
        response_deadline: '2024-01-01T00:00:00Z',
      })

      const reviews = [
        createMockReview({
          id: 'review-1',
          participant_id: 'participant-1',
          week_number: 1,
          album_type: 'contemporary',
          rating: 8.3,
        }),
        createMockReview({
          id: 'review-2',
          participant_id: 'participant-1',
          week_number: 1,
          album_type: 'contemporary',
          rating: 8.7,
        }),
      ]

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null })

      mockSupabase.order
        .mockResolvedValueOnce({ data: reviews, error: null })
        .mockResolvedValueOnce({ data: [week1], error: null })

      mockSupabase.in.mockResolvedValueOnce({
        data: [week1],
        error: null,
      })

      const request = new Request('http://localhost/api/my-reviews?email=rounding@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)
      // (8.3 + 8.7) / 2 = 8.5
      expect(data.data.stats.avgContemporaryRating).toBe(8.5)
    })
  })

  describe('Current week determination', () => {
    it('determines current week as latest published week', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'current@test.com',
        name: 'Current User',
        is_curator: false,
      })

      const week1 = createMockWeek({
        week_number: 1,
        published_at: '2024-01-01T12:00:00Z',
      })

      const week2 = createMockWeek({
        week_number: 2,
        published_at: '2024-01-08T12:00:00Z',
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null })

      mockSupabase.order
        .mockResolvedValueOnce({ data: [], error: null }) // Reviews
        .mockResolvedValueOnce({ data: [week2, week1], error: null }) // All weeks

      const request = new Request('http://localhost/api/my-reviews?email=current@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)
      expect(mockSupabase.not).toHaveBeenCalledWith('published_at', 'is', null)

      const currentWeek = data.data.allWeeks.find((w) => w.isCurrentWeek)
      expect(currentWeek).toBeDefined()
      if (!currentWeek) {
        throw new Error('Expected a current week to be defined.')
      }
      expect(currentWeek.week_number).toBe(2)
    })

    it('returns no current week when no published weeks exist', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'expired@test.com',
        name: 'Expired User',
        is_curator: false,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null })

      mockSupabase.order
        .mockResolvedValueOnce({ data: [], error: null }) // Reviews
        .mockResolvedValueOnce({ data: [], error: null }) // All weeks

      const request = new Request('http://localhost/api/my-reviews?email=expired@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)

      const currentWeek = data.data.allWeeks.find((w) => w.isCurrentWeek)
      expect(currentWeek).toBeUndefined()
    })
  })

  describe('Week review status', () => {
    it('marks weeks as past deadline correctly', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'deadline@test.com',
        name: 'Deadline User',
        is_curator: false,
      })

      const week1 = createMockWeek({
        week_number: 1,
        published_at: '2024-01-01T12:00:00Z',
      })

      const week2 = createMockWeek({
        week_number: 2,
        published_at: '2024-01-08T12:00:00Z',
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null })

      mockSupabase.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [week2, week1], error: null })

      const request = new Request('http://localhost/api/my-reviews?email=deadline@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)

      const pastWeek = data.data.allWeeks.find((w) => w.week_number === 1)
      const futureWeek = data.data.allWeeks.find((w) => w.week_number === 2)

      expect(pastWeek).toBeDefined()
      expect(futureWeek).toBeDefined()
      if (!pastWeek || !futureWeek) {
        throw new Error('Expected both weeks to be defined.')
      }
      expect(pastWeek.isPastDeadline).toBe(true)
      expect(futureWeek.isPastDeadline).toBe(false)
    })

    it('associates reviews with correct weeks', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'assoc@test.com',
        name: 'Assoc User',
        is_curator: false,
      })

      const week1 = createMockWeek({
        week_number: 1,
        response_deadline: '2024-01-01T00:00:00Z',
      })

      const week2 = createMockWeek({
        week_number: 2,
        response_deadline: '2024-01-08T00:00:00Z',
      })

      const reviews = [
        createMockReview({
          id: 'review-1',
          participant_id: 'participant-1',
          week_number: 1,
          album_type: 'contemporary',
          rating: 8.5,
        }),
        createMockReview({
          id: 'review-2',
          participant_id: 'participant-1',
          week_number: 1,
          album_type: 'classic',
          rating: 9.0,
        }),
      ]

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null })

      mockSupabase.order
        .mockResolvedValueOnce({ data: reviews, error: null })
        .mockResolvedValueOnce({ data: [week2, week1], error: null })

      mockSupabase.in.mockResolvedValueOnce({
        data: [week1],
        error: null,
      })

      const request = new Request('http://localhost/api/my-reviews?email=assoc@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)

      const week1Data = data.data.allWeeks.find((w) => w.week_number === 1)
      const week2Data = data.data.allWeeks.find((w) => w.week_number === 2)

      expect(week1Data).toBeDefined()
      expect(week2Data).toBeDefined()
      if (!week1Data || !week2Data) {
        throw new Error('Expected both weeks to be defined.')
      }
      expect(week1Data.reviews.contemporary).not.toBeNull()
      expect(week1Data.reviews.classic).not.toBeNull()
      if (!week1Data.reviews.contemporary || !week1Data.reviews.classic) {
        throw new Error('Expected reviews to be present for week 1.')
      }
      expect(week1Data.reviews.contemporary.rating).toBe(8.5)
      expect(week1Data.reviews.classic.rating).toBe(9.0)

      expect(week2Data.reviews.contemporary).toBeNull()
      expect(week2Data.reviews.classic).toBeNull()
    })
  })

  describe('Curator status', () => {
    it('includes curator status in response', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const curator = createMockParticipant({
        id: 'participant-1',
        email: 'curator@test.com',
        name: 'Curator User',
        is_curator: true,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: curator, error: null })

      mockSupabase.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      const request = new Request('http://localhost/api/my-reviews?email=curator@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiResponse

      expect(response.status).toBe(200)
      expect(data.data.participant.isCurator).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('returns 500 when reviews query fails', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'error@test.com',
        name: 'Error User',
        is_curator: false,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null })

      mockSupabase.order
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed'),
        })

      const request = new Request('http://localhost/api/my-reviews?email=error@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiErrorResponse

      expect(response.status).toBe(500)
      expect(data.error).toContain('Database connection failed')
    })

    it('returns 500 when weeks query fails', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const participant = createMockParticipant({
        id: 'participant-1',
        email: 'error2@test.com',
        name: 'Error User 2',
        is_curator: false,
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: participant, error: null })

      mockSupabase.order
        .mockResolvedValueOnce({ data: [], error: null }) // Reviews succeed
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed'),
        }) // Weeks fail

      const request = new Request('http://localhost/api/my-reviews?email=error2@test.com', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = (await response.json()) as ApiErrorResponse

      expect(response.status).toBe(500)
      expect(data.error).toContain('Database connection failed')
    })
  })
})
