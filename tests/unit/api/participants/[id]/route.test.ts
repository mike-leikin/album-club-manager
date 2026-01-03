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
import { PUT, DELETE } from '@/app/api/participants/[id]/route'
import { createServerClient } from '@/lib/supabaseClient'
import { requireCuratorApi } from '@/lib/auth/apiAuth'

const mockCreateServerClient = vi.mocked(createServerClient)
const mockRequireCuratorApi = vi.mocked(requireCuratorApi)

describe('Participant [id] API', () => {
  let mockSupabase: any
  let mockParticipant: ReturnType<typeof createMockParticipant>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock auth to pass by default
    mockRequireCuratorApi.mockResolvedValue(null)

    // Create mock participant
    mockParticipant = createMockParticipant({
      id: 'participant-1',
      name: 'Alice Smith',
      email: 'alice@test.com',
      deleted_at: null,
    })

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }

    mockCreateServerClient.mockReturnValue(mockSupabase)
  })

  describe('PUT /api/participants/[id]', () => {
    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        const unauthorizedResponse = new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401 }
        )
        mockRequireCuratorApi.mockResolvedValueOnce(unauthorizedResponse as any)

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'New Name' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
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

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'New Name' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Forbidden: Curator access required')
      })
    })

    describe('Validation', () => {
      it('returns 400 when name is empty string', async () => {
        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ name: '' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name cannot be empty')
      })

      it('returns 400 when name is only whitespace', async () => {
        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ name: '   ' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name cannot be empty')
      })

      it('returns 400 when email is empty string', async () => {
        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ email: '' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Email cannot be empty')
      })

      it('returns 400 when email is only whitespace', async () => {
        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ email: '   ' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Email cannot be empty')
      })

      it('returns 400 when no fields to update', async () => {
        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({}),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('No fields to update')
      })
    })

    describe('Successful updates', () => {
      it('updates participant name', async () => {
        const updatedParticipant = {
          ...mockParticipant,
          name: 'Alice Johnson',
        }

        mockSupabase.select.mockReturnValueOnce(mockSupabase) // For .select() chain
        mockSupabase.single.mockResolvedValueOnce({
          data: updatedParticipant,
          error: null,
        })

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Alice Johnson' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.name).toBe('Alice Johnson')

        // Verify update was called with trimmed name
        expect(mockSupabase.update).toHaveBeenCalledWith({
          name: 'Alice Johnson',
        })
      })

      it('updates participant email', async () => {
        const updatedParticipant = {
          ...mockParticipant,
          email: 'alice.new@test.com',
        }

        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: updatedParticipant,
          error: null,
        })

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ email: 'alice.new@test.com' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.email).toBe('alice.new@test.com')

        // Verify update was called with lowercase email
        expect(mockSupabase.update).toHaveBeenCalledWith({
          email: 'alice.new@test.com',
        })
      })

      it('updates both name and email', async () => {
        const updatedParticipant = {
          ...mockParticipant,
          name: 'Alice Johnson',
          email: 'alice.new@test.com',
        }

        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: updatedParticipant,
          error: null,
        })

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Alice Johnson',
            email: 'alice.new@test.com'
          }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.name).toBe('Alice Johnson')
        expect(data.data.email).toBe('alice.new@test.com')
      })

      it('trims whitespace from name', async () => {
        const updatedParticipant = {
          ...mockParticipant,
          name: 'Trimmed Name',
        }

        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: updatedParticipant,
          error: null,
        })

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ name: '  Trimmed Name  ' }),
        })

        await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })

        // Verify update was called with trimmed value
        expect(mockSupabase.update).toHaveBeenCalledWith({
          name: 'Trimmed Name',
        })
      })

      it('converts email to lowercase', async () => {
        const updatedParticipant = {
          ...mockParticipant,
          email: 'uppercase@test.com',
        }

        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: updatedParticipant,
          error: null,
        })

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ email: 'UPPERCASE@TEST.COM' }),
        })

        await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })

        // Verify update was called with lowercase email
        expect(mockSupabase.update).toHaveBeenCalledWith({
          email: 'uppercase@test.com',
        })
      })
    })

    describe('Error handling', () => {
      it('returns 409 when new email already exists', async () => {
        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'Unique constraint violation' },
        })

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ email: 'existing@test.com' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.error).toBe('A participant with this email already exists')
      })

      it('returns 404 when participant not found', async () => {
        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        })

        const request = new Request('http://localhost/api/participants/nonexistent-id', {
          method: 'PUT',
          body: JSON.stringify({ name: 'New Name' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'nonexistent-id' })
        })
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Participant not found')
      })

      it('returns 500 for other database errors', async () => {
        mockSupabase.select.mockReturnValueOnce(mockSupabase)
        mockSupabase.single.mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed'),
        })

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'New Name' }),
        })

        const response = await PUT(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toContain('Database connection failed')
      })
    })
  })

  describe('DELETE /api/participants/[id]', () => {
    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        const unauthorizedResponse = new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401 }
        )
        mockRequireCuratorApi.mockResolvedValueOnce(unauthorizedResponse as any)

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'DELETE',
        })

        const response = await DELETE(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
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

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'DELETE',
        })

        const response = await DELETE(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Forbidden: Curator access required')
      })
    })

    describe('Successful deletion', () => {
      it('soft deletes participant and returns review count', async () => {
        // Create a single mock supabase that handles both queries
        const deleteSupabase = {
          from: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
        }

        // First call to eq (in review count query) returns the count
        // Second call to is (in update query) returns success
        deleteSupabase.eq
          .mockResolvedValueOnce({ count: 5, error: null }) // Review count query result
          .mockReturnValueOnce(deleteSupabase) // Update query .eq() chain

        deleteSupabase.is.mockResolvedValueOnce({ error: null }) // Update query result

        mockCreateServerClient.mockReturnValueOnce(deleteSupabase as any)

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'DELETE',
        })

        const response = await DELETE(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.reviewCount).toBe(5)

        // Verify review count was queried
        expect(deleteSupabase.select).toHaveBeenCalledWith('*', {
          count: 'exact',
          head: true,
        })

        // Verify soft delete (sets deleted_at timestamp)
        expect(deleteSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            deleted_at: expect.any(String),
          })
        )
      })

      it('returns 0 review count when participant has no reviews', async () => {
        const deleteSupabase = {
          from: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
        }

        deleteSupabase.eq
          .mockResolvedValueOnce({ count: 0, error: null }) // Review count query result
          .mockReturnValueOnce(deleteSupabase) // Update query .eq() chain

        deleteSupabase.is.mockResolvedValueOnce({ error: null }) // Update query result

        mockCreateServerClient.mockReturnValueOnce(deleteSupabase as any)

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'DELETE',
        })

        const response = await DELETE(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.reviewCount).toBe(0)
      })

      it('handles null count from database', async () => {
        const deleteSupabase = {
          from: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
        }

        deleteSupabase.eq
          .mockResolvedValueOnce({ count: null, error: null }) // Review count query result
          .mockReturnValueOnce(deleteSupabase) // Update query .eq() chain

        deleteSupabase.is.mockResolvedValueOnce({ error: null }) // Update query result

        mockCreateServerClient.mockReturnValueOnce(deleteSupabase as any)

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'DELETE',
        })

        const response = await DELETE(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.reviewCount).toBe(0) // null converts to 0
      })
    })

    describe('Error handling', () => {
      it('returns 500 when database error occurs', async () => {
        const deleteSupabase = {
          from: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
        }

        deleteSupabase.eq
          .mockResolvedValueOnce({ count: 5, error: null }) // Review count query succeeds
          .mockReturnValueOnce(deleteSupabase) // Update query .eq() chain

        deleteSupabase.is.mockResolvedValueOnce({
          error: new Error('Database connection failed'),
        }) // Update query fails

        mockCreateServerClient.mockReturnValueOnce(deleteSupabase as any)

        const request = new Request('http://localhost/api/participants/participant-1', {
          method: 'DELETE',
        })

        const response = await DELETE(request as any, {
          params: Promise.resolve({ id: 'participant-1' })
        })
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toContain('Database connection failed')
      })
    })
  })
})
