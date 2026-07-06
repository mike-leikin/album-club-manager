import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockParticipant } from '@/tests/mocks/factories/participantFactory'
import { createMockReview } from '@/tests/mocks/factories/reviewFactory'
import { createMockWeek } from '@/tests/mocks/factories/weekFactory'

vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => ({
  requireAuth: vi.fn(),
}))

import { GET } from '@/app/api/my-reviews/export/route'
import { createServerClient } from '@/lib/supabaseClient'
import { requireAuth } from '@/lib/auth/utils'
import type { UserSession } from '@/lib/auth/utils'

const mockCreateServerClient = vi.mocked(createServerClient)
const mockRequireAuth = vi.mocked(requireAuth)

describe('My Reviews Export API', () => {
  type MockSupabase = {
    from: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
  }

  let mockSupabase: MockSupabase

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn(),
      single: vi.fn(),
    }

    mockCreateServerClient.mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createServerClient>
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 when not authenticated in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    mockRequireAuth.mockRejectedValueOnce(new Error('Unauthorized'))

    const request = new Request('http://localhost/api/my-reviews/export', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = (await response.json()) as { error: string }

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

    const request = new Request('http://localhost/api/my-reviews/export', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = (await response.json()) as { error: string; details?: string }

    expect(response.status).toBe(404)
    expect(data.error).toContain('Participant not found')
  })

  it('returns a CSV scoped to the requesting participant, with fields escaped', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const participant = createMockParticipant({
      id: 'participant-1',
      email: 'dev@test.com',
      name: 'Dev User',
    })

    const week1 = createMockWeek({
      week_number: 1,
      contemporary_title: 'Test Album',
      contemporary_artist: 'Earth, Wind & Fire',
      classic_title: 'Rumours',
      classic_artist: 'Fleetwood Mac',
    })

    const reviews = [
      createMockReview({
        id: 'review-1',
        participant_id: 'participant-1',
        week_number: 1,
        album_type: 'contemporary',
        rating: 8.5,
        review_text: 'Great, "wow" album',
      }),
    ]

    mockSupabase.single.mockResolvedValueOnce({ data: participant, error: null })
    mockSupabase.order.mockResolvedValueOnce({ data: reviews, error: null })
    mockSupabase.in.mockResolvedValueOnce({ data: [week1], error: null })

    const request = new Request('http://localhost/api/my-reviews/export?email=dev@test.com', {
      method: 'GET',
    })

    const response = await GET(request)
    const csv = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/csv')
    expect(mockSupabase.eq).toHaveBeenCalledWith('participant_id', 'participant-1')
    expect(csv).toContain('Week Number,Album Type,Album Title,Artist,Year')
    expect(csv).toContain('"Earth, Wind & Fire"')
    expect(csv).toContain('"Great, ""wow"" album"')
  })
})
