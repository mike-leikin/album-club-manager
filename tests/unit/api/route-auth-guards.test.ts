import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Regression tests: these routes use the service-role Supabase client and
// previously had no auth check, exposing participant emails and letting
// anyone trigger email sends. They must reject non-curators before any
// database or third-party call happens.

vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/apiAuth', () => ({
  requireCuratorApi: vi.fn(),
}))

vi.mock('@/lib/spotifyClient', () => ({
  spotifyClient: { searchAlbums: vi.fn(), search: vi.fn() },
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn() }
  },
}))

import { createServerClient } from '@/lib/supabaseClient'
import { requireCuratorApi } from '@/lib/auth/apiAuth'
import { GET as emailLogsGET } from '@/app/api/email/logs/route'
import { GET as emailLogsSummaryGET } from '@/app/api/email/logs/summary/route'
import { POST as emailRetryPOST } from '@/app/api/email/retry/route'
import { GET as reviewCountGET } from '@/app/api/participants/[id]/review-count/route'
import { GET as playlistsGET } from '@/app/api/playlists/route'
import { GET as spotifySearchGET } from '@/app/api/spotify/search/route'
import { GET as rs500GET } from '@/app/api/rs500/route'
import { PATCH as rs500TrackUsagePATCH } from '@/app/api/rs500/[rank]/track-usage/route'
import { GET as weeksAllGET } from '@/app/api/weeks/all/route'
import { GET as reviewsGET } from '@/app/api/reviews/route'

const mockCreateServerClient = vi.mocked(createServerClient)
const mockRequireCuratorApi = vi.mocked(requireCuratorApi)

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const req = (path: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? 'GET',
    ...(init?.body !== undefined && {
      body: JSON.stringify(init.body),
      headers: { 'Content-Type': 'application/json' },
    }),
  })

const guardedRoutes: Array<[string, () => Promise<Response>]> = [
  ['GET /api/email/logs', () => emailLogsGET(req('/api/email/logs'))],
  ['GET /api/email/logs/summary', () => emailLogsSummaryGET(req('/api/email/logs/summary'))],
  [
    'POST /api/email/retry',
    () => emailRetryPOST(req('/api/email/retry', { method: 'POST', body: { weekNumber: 1 } })),
  ],
  [
    'GET /api/participants/[id]/review-count',
    () =>
      reviewCountGET(req('/api/participants/abc/review-count'), {
        params: Promise.resolve({ id: 'abc' }),
      }),
  ],
  ['GET /api/playlists', () => playlistsGET(req('/api/playlists?week_number=1'))],
  ['GET /api/spotify/search', () => spotifySearchGET(req('/api/spotify/search?q=test'))],
  ['GET /api/rs500', () => rs500GET(req('/api/rs500'))],
  [
    'PATCH /api/rs500/[rank]/track-usage',
    () =>
      rs500TrackUsagePATCH(req('/api/rs500/1/track-usage', { method: 'PATCH' }), {
        params: Promise.resolve({ rank: '1' }),
      } as never),
  ],
  ['GET /api/weeks/all', () => weeksAllGET(req('/api/weeks/all'))],
]

describe('Curator-only API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCuratorApi.mockResolvedValue(unauthorized())
  })

  it.each(guardedRoutes)('%s rejects unauthenticated callers', async (_name, call) => {
    const response = await call()

    expect(response.status).toBe(401)
    expect(mockRequireCuratorApi).toHaveBeenCalledTimes(1)
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })
})

describe('GET /api/reviews', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCuratorApi.mockResolvedValue(unauthorized())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewsQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    }
    const countQuery = {
      select: vi.fn().mockResolvedValue({ count: 0, error: null }),
    }

    mockSupabase = {
      reviewsQuery,
      from: vi.fn((table: string) => (table === 'reviews' ? reviewsQuery : countQuery)),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)
  })

  it('stays public and only exposes participant id and name', async () => {
    const response = await reviewsGET(req('/api/reviews?week_number=1'))

    expect(response.status).toBe(200)
    expect(mockRequireCuratorApi).not.toHaveBeenCalled()

    const selectArg: string = mockSupabase.reviewsQuery.select.mock.calls[0][0]
    expect(selectArg).toMatch(/participants!reviews_participant_id_fkey\(id, name\)/)
    expect(selectArg).not.toMatch(/\(\*\)/)
    expect(mockSupabase.reviewsQuery.eq).toHaveBeenCalledWith('moderation_status', 'approved')
  })

  it('requires a curator to include unmoderated reviews (all=true)', async () => {
    const response = await reviewsGET(req('/api/reviews?week_number=1&all=true'))

    expect(response.status).toBe(401)
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('lets curators include unmoderated reviews', async () => {
    mockRequireCuratorApi.mockResolvedValue(null)

    const response = await reviewsGET(req('/api/reviews?week_number=1&all=true'))

    expect(response.status).toBe(200)
    expect(mockSupabase.reviewsQuery.eq).not.toHaveBeenCalledWith('moderation_status', 'approved')
  })
})
