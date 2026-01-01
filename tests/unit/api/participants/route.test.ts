import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockParticipant } from '@/tests/mocks/factories/participantFactory'

// Mock all dependencies
vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/apiAuth', () => ({
  requireCuratorApi: vi.fn(),
}))

// Import after mocking
import { GET, POST } from '@/app/api/participants/route'
import { createServerClient } from '@/lib/supabaseClient'
import { requireCuratorApi } from '@/lib/auth/apiAuth'

const mockCreateServerClient = vi.mocked(createServerClient)
const mockRequireCuratorApi = vi.mocked(requireCuratorApi)

describe('Participants API', () => {
  let mockSupabase: any
  let mockParticipants: ReturnType<typeof createMockParticipant>[]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock auth to pass by default
    mockRequireCuratorApi.mockResolvedValue(null)

    // Create mock participants
    mockParticipants = [
      createMockParticipant({
        id: 'participant-1',
        name: 'Alice Smith',
        email: 'alice@test.com',
        deleted_at: null,
      }),
      createMockParticipant({
        id: 'participant-2',
        name: 'Bob Jones',
        email: 'bob@test.com',
        deleted_at: null,
      }),
      createMockParticipant({
        id: 'participant-3',
        name: 'Charlie Brown',
        email: 'charlie@test.com',
        deleted_at: '2024-01-01T00:00:00Z',
      }),
    ]

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }

    mockCreateServerClient.mockReturnValue(mockSupabase)
  })

  describe('GET /api/participants', () => {
    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        const unauthorizedResponse = new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401 }
        )
        mockRequireCuratorApi.mockResolvedValueOnce(unauthorizedResponse as any)

        const request = new Request('http://localhost/api/participants', {
          method: 'GET',
        })

        const response = await GET(request as any)
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

        const request = new Request('http://localhost/api/participants', {
          method: 'GET',
        })

        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Forbidden: Curator access required')
      })
    })

    describe('Listing participants', () => {
      it('lists all active participants by default', async () => {
        const activeParticipants = mockParticipants.filter(p => !p.deleted_at)

        mockSupabase.select.mockReturnValueOnce(mockSupabase) // For select chain
        mockSupabase.order.mockReturnValueOnce(mockSupabase)  // For order chain
        mockSupabase.is.mockResolvedValueOnce({
          data: activeParticipants,
          error: null,
        })

        const request = new Request('http://localhost/api/participants', {
          method: 'GET',
        })

        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(2)
        expect(data.data.every((p: any) => !p.deleted_at)).toBe(true)

        // Verify is() was called to filter out deleted
        expect(mockSupabase.is).toHaveBeenCalledWith('deleted_at', null)
      })

      it('includes deleted participants when includeDeleted=true', async () => {
        mockSupabase.select.mockReturnValueOnce(mockSupabase) // For select chain
        mockSupabase.order.mockResolvedValueOnce({
          data: mockParticipants,
          error: null,
        })

        const request = new Request('http://localhost/api/participants?includeDeleted=true', {
          method: 'GET',
        })

        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(3)

        // Verify is() was NOT called
        expect(mockSupabase.is).not.toHaveBeenCalled()
      })

      it('returns 500 when database query fails', async () => {
        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.order.mockReturnValueOnce(mockSupabase)
        mockSupabase.is.mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed'),
        })

        const request = new Request('http://localhost/api/participants', {
          method: 'GET',
        })

        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toContain('Database connection failed')
      })
    })
  })

  describe('POST /api/participants', () => {
    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        const unauthorizedResponse = new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401 }
        )
        mockRequireCuratorApi.mockResolvedValueOnce(unauthorizedResponse as any)

        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test User', email: 'test@test.com' }),
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

        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test User', email: 'test@test.com' }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Forbidden: Curator access required')
      })
    })

    describe('Validation', () => {
      it('returns 400 when name is missing', async () => {
        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com' }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and email are required')
      })

      it('returns 400 when email is missing', async () => {
        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test User' }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and email are required')
      })

      it('returns 400 when name is empty string', async () => {
        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({ name: '', email: 'test@test.com' }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and email are required')
      })

      it('returns 400 when name is only whitespace', async () => {
        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({ name: '   ', email: 'test@test.com' }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and email are required')
      })
    })

    describe('Successful creation', () => {
      it('creates new participant with valid data', async () => {
        const newParticipant = createMockParticipant({
          id: 'new-participant-1',
          name: 'New User',
          email: 'newuser@test.com',
        })

        mockSupabase.select.mockReturnValueOnce(mockSupabase) // For insert().select() chain
        mockSupabase.single.mockResolvedValueOnce({
          data: newParticipant,
          error: null,
        })

        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({ name: 'New User', email: 'newuser@test.com' }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.data.name).toBe('New User')
        expect(data.data.email).toBe('newuser@test.com')
      })

      it('trims whitespace from name and email', async () => {
        const newParticipant = createMockParticipant({
          id: 'new-participant-2',
          name: 'Trimmed User',
          email: 'trimmed@test.com',
        })

        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: newParticipant,
          error: null,
        })

        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({
            name: '  Trimmed User  ',
            email: '  TRIMMED@TEST.COM  '
          }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(201)

        // Verify insert was called with trimmed values
        expect(mockSupabase.insert).toHaveBeenCalledWith({
          name: 'Trimmed User',
          email: 'trimmed@test.com',
        })
      })

      it('converts email to lowercase', async () => {
        const newParticipant = createMockParticipant({
          id: 'new-participant-3',
          name: 'Case Test',
          email: 'casetest@test.com',
        })

        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: newParticipant,
          error: null,
        })

        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Case Test',
            email: 'CaseTest@TEST.COM'
          }),
        })

        await POST(request as any)

        // Verify insert was called with lowercase email
        expect(mockSupabase.insert).toHaveBeenCalledWith({
          name: 'Case Test',
          email: 'casetest@test.com',
        })
      })
    })

    describe('Error handling', () => {
      it('returns 409 when email already exists', async () => {
        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'Unique constraint violation' },
        })

        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Duplicate User',
            email: 'alice@test.com' // Already exists
          }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.error).toBe('A participant with this email already exists')
      })

      it('returns 500 for other database errors', async () => {
        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed'),
        })

        const request = new Request('http://localhost/api/participants', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'test@test.com'
          }),
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toContain('Database connection failed')
      })
    })
  })
})
