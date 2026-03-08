import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Module-level mock for the Anthropic messages.create call
const mockMessagesCreate = vi.fn()

// Mock all external dependencies before importing the route
vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/apiAuth', () => ({
  requireCuratorApi: vi.fn(),
}))

vi.mock('@/lib/spotifyClient', () => ({
  spotifyClient: {
    searchAlbums: vi.fn(),
    getNewReleases: vi.fn(),
  },
}))

vi.mock('@/lib/pitchforkClient', () => ({
  fetchRecentReviews: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: (...args: unknown[]) => mockMessagesCreate(...args) }
  },
}))

import { GET } from '@/app/api/albums/discover/route'
import { createServerClient } from '@/lib/supabaseClient'
import { requireCuratorApi } from '@/lib/auth/apiAuth'
import { spotifyClient } from '@/lib/spotifyClient'
import { fetchRecentReviews } from '@/lib/pitchforkClient'
import type { DiscoveryResult } from '@/app/api/albums/discover/route'

const mockCreateServerClient = vi.mocked(createServerClient)
const mockRequireCuratorApi = vi.mocked(requireCuratorApi)
const mockFetchRecentReviews = vi.mocked(fetchRecentReviews)
const mockSearchAlbums = vi.mocked(spotifyClient.searchAlbums)
const mockGetNewReleases = vi.mocked(spotifyClient.getNewReleases)

// Minimal Spotify album shape for tests
function makeSpotifyAlbum(overrides: Partial<{
  id: string; name: string; artist: string; release_date: string; spotify_url: string; art_url: string;
}> = {}) {
  const o = {
    id: 'album-1', name: 'Test Album', artist: 'Test Artist',
    release_date: '2026-03-01', spotify_url: 'https://open.spotify.com/album/1',
    art_url: 'https://example.com/art.jpg', ...overrides,
  }
  return {
    id: o.id,
    name: o.name,
    artists: [{ id: 'artist-1', name: o.artist, uri: 'spotify:artist:1' }],
    release_date: o.release_date,
    images: [{ url: o.art_url, height: 640, width: 640 }],
    external_urls: { spotify: o.spotify_url },
    uri: `spotify:album:${o.id}`,
  }
}

// Minimal Pitchfork review shape for tests
function makePitchforkReview(overrides: Partial<{
  title: string; artist: string; score: number | null;
  isBestNewMusic: boolean; publishedAt: Date; reviewUrl: string;
}> = {}) {
  return {
    title: 'Great Album',
    artist: 'Great Artist',
    score: 8.5,
    isBestNewMusic: false,
    publishedAt: new Date('2026-03-05'),
    reviewUrl: 'https://pitchfork.com/reviews/albums/great-album/',
    ...overrides,
  }
}

describe('Album Discovery API', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Default: curator auth passes
    mockRequireCuratorApi.mockResolvedValue(null)

    // Supabase chained builder – limit() resolves weeks query, in() resolves reviews query
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    // Default sources: empty
    mockFetchRecentReviews.mockResolvedValue([])
    mockGetNewReleases.mockResolvedValue([])
    mockSearchAlbums.mockResolvedValue([])

    // Default Claude: return empty JSON array
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[]' }],
    })

    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      const { NextResponse } = await import('next/server')
      mockRequireCuratorApi.mockResolvedValueOnce(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)

      expect(response.status).toBe(401)
    })
  })

  describe('Empty sources', () => {
    it('returns empty results when no albums found', async () => {
      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results).toEqual([])
    })
  })

  describe('Pitchfork source', () => {
    it('returns Pitchfork reviews enriched with Spotify data', async () => {
      const review = makePitchforkReview({ title: 'Bright Future', artist: 'Adrianne Lenker', score: 8.1 })
      mockFetchRecentReviews.mockResolvedValueOnce([review])
      mockSearchAlbums.mockResolvedValueOnce([
        makeSpotifyAlbum({ name: 'Bright Future', artist: 'Adrianne Lenker', release_date: '2024-03-22' }),
      ])
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify([{
            title: 'Bright Future',
            artist: 'Adrianne Lenker',
            claudeFitScore: 9,
            claudeExplanation: 'Introspective folk — perfect for this club.',
          }]),
        }],
      })

      const request = new Request('http://localhost/api/albums/discover?weeks=2')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(1)

      const result = data.results[0]
      expect(result.title).toBe('Bright Future')
      expect(result.artist).toBe('Adrianne Lenker')
      expect(result.pitchforkScore).toBe(8.1)
      expect(result.source).toBe('pitchfork')
      expect(result.spotifyUrl).toBe('https://open.spotify.com/album/1')
      expect(result.claudeFitScore).toBe(9)
      expect(result.claudeExplanation).toBe('Introspective folk — perfect for this club.')
    })

    it('flags Best New Music reviews', async () => {
      mockFetchRecentReviews.mockResolvedValueOnce([
        makePitchforkReview({ isBestNewMusic: true, score: 8.8 }),
      ])
      mockSearchAlbums.mockResolvedValueOnce([makeSpotifyAlbum()])

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results[0].isBestNewMusic).toBe(true)
    })

    it('handles Spotify enrichment failure gracefully', async () => {
      mockFetchRecentReviews.mockResolvedValueOnce([makePitchforkReview()])
      mockSearchAlbums.mockRejectedValueOnce(new Error('Spotify unavailable'))

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(1)
      expect(data.results[0].spotifyUrl).toBeNull()
      expect(data.results[0].albumArtUrl).toBeNull()
    })
  })

  describe('Spotify new releases source', () => {
    it('includes Spotify new releases not covered by Pitchfork', async () => {
      mockGetNewReleases.mockResolvedValueOnce([
        makeSpotifyAlbum({ id: 'new-1', name: 'New Release', artist: 'New Artist' }),
      ])

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(1)
      expect(data.results[0].source).toBe('spotify-new-releases')
      expect(data.results[0].title).toBe('New Release')
    })

    it('marks albums appearing in both sources as "both"', async () => {
      mockFetchRecentReviews.mockResolvedValueOnce([
        makePitchforkReview({ title: 'Shared Album', artist: 'Shared Artist' }),
      ])
      mockSearchAlbums.mockResolvedValueOnce([
        makeSpotifyAlbum({ name: 'Shared Album', artist: 'Shared Artist' }),
      ])
      mockGetNewReleases.mockResolvedValueOnce([
        makeSpotifyAlbum({ name: 'Shared Album', artist: 'Shared Artist' }),
      ])

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(1)
      expect(data.results[0].source).toBe('both')
    })
  })

  describe('Sorting', () => {
    it('sorts Best New Music albums first', async () => {
      mockFetchRecentReviews.mockResolvedValueOnce([
        makePitchforkReview({ title: 'Regular Album', artist: 'Artist A', isBestNewMusic: false }),
        makePitchforkReview({ title: 'BNM Album', artist: 'Artist B', isBestNewMusic: true }),
      ])
      // Spotify search returns empty for both (graceful degradation)
      mockSearchAlbums.mockResolvedValue([])

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(2)
      expect(data.results[0].isBestNewMusic).toBe(true)
      expect(data.results[0].title).toBe('BNM Album')
    })
  })

  describe('Claude fallback', () => {
    it('uses fallback rankings when ANTHROPIC_API_KEY is not set', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', '')
      mockFetchRecentReviews.mockResolvedValueOnce([makePitchforkReview({ isBestNewMusic: true })])
      mockSearchAlbums.mockResolvedValueOnce([makeSpotifyAlbum()])

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results[0].claudeFitScore).toBe(8) // BNM fallback score
      expect(data.results[0].claudeExplanation).toContain('Pitchfork Best New Music')
    })

    it('uses fallback rankings when Claude API call fails', async () => {
      mockFetchRecentReviews.mockResolvedValueOnce([makePitchforkReview({ score: 8.0 })])
      mockSearchAlbums.mockResolvedValueOnce([makeSpotifyAlbum()])
      mockMessagesCreate.mockRejectedValueOnce(new Error('API error'))

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results[0].claudeFitScore).toBe(7) // has Pitchfork score → fallback score 7
    })

    it('uses fallback rankings when Claude returns malformed JSON', async () => {
      mockFetchRecentReviews.mockResolvedValueOnce([makePitchforkReview()])
      mockSearchAlbums.mockResolvedValueOnce([makeSpotifyAlbum()])
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'I cannot provide a JSON response right now.' }],
      })

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results[0].claudeFitScore).toBeGreaterThanOrEqual(1)
    })
  })

  describe('weeks parameter', () => {
    it('passes weeks parameter to fetchRecentReviews', async () => {
      const request = new Request('http://localhost/api/albums/discover?weeks=4')
      await GET(request as never)

      expect(mockFetchRecentReviews).toHaveBeenCalledWith(4)
    })

    it('clamps weeks to max of 4', async () => {
      const request = new Request('http://localhost/api/albums/discover?weeks=10')
      await GET(request as never)

      expect(mockFetchRecentReviews).toHaveBeenCalledWith(4)
    })

    it('defaults to 2 weeks when not specified', async () => {
      const request = new Request('http://localhost/api/albums/discover')
      await GET(request as never)

      expect(mockFetchRecentReviews).toHaveBeenCalledWith(2)
    })
  })

  describe('Error handling', () => {
    it('handles Pitchfork fetch failure gracefully by using Spotify results', async () => {
      mockFetchRecentReviews.mockRejectedValueOnce(new Error('Pitchfork unavailable'))
      mockGetNewReleases.mockResolvedValueOnce([makeSpotifyAlbum()])

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(1)
      expect(data.results[0].source).toBe('spotify-new-releases')
    })

    it('handles Spotify new releases failure gracefully by using Pitchfork results', async () => {
      mockFetchRecentReviews.mockResolvedValueOnce([makePitchforkReview()])
      mockSearchAlbums.mockResolvedValueOnce([makeSpotifyAlbum()])
      mockGetNewReleases.mockRejectedValueOnce(new Error('Spotify unavailable'))

      const request = new Request('http://localhost/api/albums/discover')
      const response = await GET(request as never)
      const data = await response.json() as { results: DiscoveryResult[] }

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(1)
      expect(data.results[0].source).toBe('pitchfork')
    })
  })
})
