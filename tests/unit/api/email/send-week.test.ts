import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockParticipant } from '@/tests/mocks/factories/participantFactory'
import { createMockWeek } from '@/tests/mocks/factories/weekFactory'

// Mock all dependencies
vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/apiAuth', () => ({
  requireCuratorApi: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createApiLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Create a container for the mock that can be accessed in tests
const mockEmailContainer = {
  send: vi.fn(),
}

vi.mock('resend', () => {
  const MockResend = class {
    get emails() {
      return mockEmailContainer
    }
  }
  return {
    Resend: MockResend,
  }
})

// Import after mocking
import { POST } from '@/app/api/email/send-week/route'
import { createServerClient } from '@/lib/supabaseClient'
import { requireCuratorApi } from '@/lib/auth/apiAuth'
import { Resend } from 'resend'

const mockCreateServerClient = vi.mocked(createServerClient)
const mockRequireCuratorApi = vi.mocked(requireCuratorApi)

describe('POST /api/email/send-week', () => {
  let mockSupabase: any
  let mockParticipants: ReturnType<typeof createMockParticipant>[]
  let mockWeek: ReturnType<typeof createMockWeek>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock auth to pass by default
    mockRequireCuratorApi.mockResolvedValue(null)

    // Create mock data
    mockParticipants = [
      createMockParticipant({
        id: 'participant-1',
        name: 'John Doe',
        email: 'john@test.com',
      }),
      createMockParticipant({
        id: 'participant-2',
        name: 'Jane Smith',
        email: 'jane@test.com',
      }),
    ]

    mockWeek = createMockWeek({
      week_number: 1,
      contemporary_title: 'Test Album',
      contemporary_artist: 'Test Artist',
      contemporary_year: '2024',
      classic_title: 'Classic Album',
      classic_artist: 'Classic Artist',
      classic_year: '1975',
      response_deadline: '2024-12-31',
    })

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
    }

    mockCreateServerClient.mockReturnValue(mockSupabase)
  })

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
      mockRequireCuratorApi.mockResolvedValueOnce(unauthorizedResponse as any)

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when not a curator', async () => {
      const forbiddenResponse = new Response(
        JSON.stringify({ error: 'Forbidden: Curator access required' }),
        { status: 403 }
      )
      mockRequireCuratorApi.mockResolvedValueOnce(forbiddenResponse as any)

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: Curator access required')
    })
  })

  describe('Validation', () => {
    it('returns 400 when weekNumber is missing', async () => {
      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Week number is required')
    })
  })

  describe('Error handling', () => {
    it('returns 404 when week not found', async () => {
      // Mock week lookup to fail
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 999 }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Week not found')
    })

    it('returns 404 when no participants found', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase) // For week .eq()
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants lookup - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase) // For participants select
      mockSupabase.is.mockReturnValueOnce(mockSupabase)     // For is(deleted_at, null)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)     // For eq(email_subscribed, true)
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No participants found')
    })
  })

  describe('Successful email sending', () => {
    it('sends emails to all participants successfully', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants lookup - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockResolvedValueOnce({
        data: mockParticipants,
        error: null,
      })

      // Mock previous week stats (week 1 has no previous week, so won't query)
      // No need to mock reviews query since prevWeek = 0

      // Mock email sending
      mockEmailContainer.send
        .mockResolvedValueOnce({ data: { id: 'email-1' } })
        .mockResolvedValueOnce({ data: { id: 'email-2' } })

      // Mock email logging (insert is called for each email)
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sent).toBe(2)
      expect(data.failed).toBe(0)
      expect(data.total).toBe(2)

      // Verify emails were sent
      expect(mockEmailContainer.send).toHaveBeenCalledTimes(2)
    })

    it('includes previous week stats in email when available', async () => {
      const mockPreviousWeekReviews = [
        {
          contemporary_rating: 8.5,
          contemporary_favorite_track: 'Song 1',
          classic_rating: 7.0,
          classic_favorite_track: 'Classic Song',
          participant: { name: 'John Doe' },
        },
      ]

      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants - .select().is().eq().order()
      mockSupabase.select
        .mockReturnValueOnce(mockSupabase)  // For participants select
        .mockReturnValueOnce(mockSupabase)  // For reviews select
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)   // For participants eq(email_subscribed)
        .mockReturnValueOnce(mockSupabase)   // For reviews eq(week_number)
        .mockResolvedValueOnce({             // For reviews eq(moderation_status)
          data: mockPreviousWeekReviews,
          error: null,
        })
      mockSupabase.order.mockResolvedValueOnce({
        data: mockParticipants,
        error: null,
      })

      // Mock email sending
      mockEmailContainer.send.mockResolvedValue({ data: { id: 'email-1' } })

      // Mock email logging
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 2 }), // Week 2, so previous week = 1
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify email content includes stats
      const emailCall = mockEmailContainer.send.mock.calls[0][0]
      expect(emailCall.html).toContain('Week 1 Results')
      expect(emailCall.html).toContain('8.5/10')
    })

    it('logs email attempts to database', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockResolvedValueOnce({
        data: mockParticipants,
        error: null,
      })

      // Mock email sending
      mockEmailContainer.send.mockResolvedValue({ data: { id: 'resend-123' } })

      // Mock insert for email logs
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      await POST(request as any)

      // Verify email logs were inserted
      expect(mockSupabase.from).toHaveBeenCalledWith('email_logs')
      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    it('handles partial email failures gracefully', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockResolvedValueOnce({
        data: mockParticipants,
        error: null,
      })

      // Mock one success and one failure
      mockEmailContainer.send
        .mockResolvedValueOnce({ data: { id: 'email-1' } })
        .mockRejectedValueOnce(new Error('Email service error'))

      // Mock email logging
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sent).toBe(1)
      expect(data.failed).toBe(1)
      expect(data.total).toBe(2)
    })
  })

  describe('Database logging', () => {
    it('continues even if database logging fails', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockParticipants[0]],
        error: null,
      })

      // Mock email sending success
      mockEmailContainer.send.mockResolvedValue({ data: { id: 'email-1' } })

      // Mock insert to throw an error
      mockSupabase.insert.mockRejectedValue(new Error('Database logging failed'))

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      // Should still succeed even if logging fails
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sent).toBe(1)
    })
  })

  describe('Unexpected errors', () => {
    it('returns 500 when an unexpected error occurs', async () => {
      // Mock week lookup to throw an unexpected error
      mockSupabase.single.mockRejectedValueOnce(new Error('Unexpected database error'))

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unexpected database error')
    })
  })

  describe('Email content', () => {
    it('includes submit URL with participant email', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockParticipants[0]],
        error: null,
      })

      mockEmailContainer.send.mockResolvedValue({ data: { id: 'email-1' } })
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      await POST(request as any)

      const emailCall = mockEmailContainer.send.mock.calls[0][0]
      expect(emailCall.html).toContain('submit?email=')
      expect(emailCall.html).toContain(encodeURIComponent(mockParticipants[0].email))
    })

    it('uses first name in greeting', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockParticipants[0]], // John Doe
        error: null,
      })

      mockEmailContainer.send.mockResolvedValue({ data: { id: 'email-1' } })
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      await POST(request as any)

      const emailCall = mockEmailContainer.send.mock.calls[0][0]
      expect(emailCall.html).toContain('Hi John')
      expect(emailCall.text).toContain('Hi John')
    })

    it('includes both contemporary and classic albums', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockParticipants[0]],
        error: null,
      })

      mockEmailContainer.send.mockResolvedValue({ data: { id: 'email-1' } })
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      await POST(request as any)

      const emailCall = mockEmailContainer.send.mock.calls[0][0]
      expect(emailCall.html).toContain('Test Album')
      expect(emailCall.html).toContain('Test Artist')
      expect(emailCall.html).toContain('Classic Album')
      expect(emailCall.html).toContain('Classic Artist')
    })

    it('includes deadline in email', async () => {
      // Mock week lookup - .eq().single()
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockWeek,
        error: null,
      })

      // Mock participants - .select().is().eq().order()
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.is.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockParticipants[0]],
        error: null,
      })

      mockEmailContainer.send.mockResolvedValue({ data: { id: 'email-1' } })
      mockSupabase.insert.mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost/api/email/send-week', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: 1 }),
      })

      await POST(request as any)

      const emailCall = mockEmailContainer.send.mock.calls[0][0]
      expect(emailCall.html).toContain('Deadline')
    })
  })
})
