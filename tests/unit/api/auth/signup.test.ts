import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/email/adminNotifications', () => ({
  sendSignupAdminNotification: vi.fn().mockResolvedValue(undefined),
}))

const mockSignInWithOtp = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { signInWithOtp: mockSignInWithOtp } })),
}))

import { POST } from '@/app/api/auth/signup/route'
import { createServerClient } from '@/lib/supabaseClient'
import { sendSignupAdminNotification } from '@/lib/email/adminNotifications'

const mockCreateServerClient = vi.mocked(createServerClient)

type Row = Record<string, unknown>

/** Minimal chainable Supabase stand-in for the signup route's queries. */
function makeSupabase({
  existingParticipant = null,
  invitation = null,
}: { existingParticipant?: Row | null; invitation?: Row | null } = {}) {
  const inserted: Row[] = []
  const chain = (result: unknown) => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'ilike', 'update']) q[m] = vi.fn(() => q)
    q.limit = vi.fn(() => Promise.resolve(result))
    q.single = vi.fn(() => Promise.resolve(result))
    q.then = (resolve: (v: unknown) => void) => resolve({ error: null })
    return q
  }
  const client = {
    inserted,
    from: vi.fn((table: string) => {
      if (table === 'invitations') {
        return chain({ data: invitation, error: invitation ? null : { message: 'not found' } })
      }
      const q = chain({ data: existingParticipant ? [existingParticipant] : [], error: null })
      q.insert = vi.fn((row: Row) => {
        inserted.push(row)
        return chain({ data: { id: 'new-id', ...row }, error: null })
      })
      return q
    }),
  }
  return client
}

const signup = (body: Record<string, unknown>) =>
  POST(
    new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Person', acceptedTerms: true, ...body }),
      headers: { 'Content-Type': 'application/json' },
    })
  )

describe('POST /api/auth/signup — disposable email blocking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithOtp.mockResolvedValue({ error: null })
  })

  it('rejects a new, uninvited signup from a disposable domain', async () => {
    const supabase = makeSupabase()
    mockCreateServerClient.mockReturnValue(supabase as never)

    const response = await signup({ email: 'vewejak623@dvdee.com' })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/permanent email/i)
    expect(supabase.inserted).toHaveLength(0)
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
    expect(sendSignupAdminNotification).not.toHaveBeenCalled()
  })

  it('allows a normal email domain', async () => {
    const supabase = makeSupabase()
    mockCreateServerClient.mockReturnValue(supabase as never)

    const response = await signup({ email: 'friend@gmail.com' })

    expect(response.status).toBe(200)
    expect(supabase.inserted).toHaveLength(1)
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(1)
  })

  it('lets an existing participant with a disposable domain finish signing up', async () => {
    const supabase = makeSupabase({
      existingParticipant: { id: 'p1', name: 'Old Member', email: 'old@dvdee.com', auth_user_id: null },
    })
    mockCreateServerClient.mockReturnValue(supabase as never)

    const response = await signup({ email: 'old@dvdee.com' })

    expect(response.status).toBe(200)
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(1)
  })

  it('lets a curator-approved invitation through even with a disposable domain', async () => {
    const supabase = makeSupabase({
      invitation: {
        id: 'inv1',
        invitee_email: 'guest@dvdee.com',
        status: 'approved',
        referrer_id: 'p1',
        referrer: { id: 'p1', name: 'Referrer', referral_count: 0 },
      },
    })
    mockCreateServerClient.mockReturnValue(supabase as never)

    const response = await signup({ email: 'guest@dvdee.com', invite_token: 'tok' })

    expect(response.status).toBe(200)
    expect(supabase.inserted).toHaveLength(1)
  })
})
