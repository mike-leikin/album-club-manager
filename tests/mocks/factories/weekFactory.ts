import type { Week } from '@/lib/types/database'

let weekIdCounter = 0

export function createMockWeek(overrides?: Partial<Week>): Week {
  weekIdCounter++
  return {
    id: `week-${weekIdCounter}`,
    week_number: weekIdCounter,
    response_deadline: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    contemporary_title: 'Contemporary Album',
    contemporary_artist: 'Contemporary Artist',
    contemporary_year: '2024',
    contemporary_spotify_url: 'https://spotify.com/album/test',
    contemporary_album_art_url: 'https://i.scdn.co/image/test',
    classic_title: 'Classic Album',
    classic_artist: 'Classic Artist',
    classic_year: '1970',
    classic_spotify_url: 'https://spotify.com/album/classic',
    classic_album_art_url: 'https://i.scdn.co/image/classic',
    rs_rank: 100,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function resetWeekCounter() {
  weekIdCounter = 0
}
