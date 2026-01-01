import { createMockWeek } from '../factories/weekFactory'

export const mockWeeks = [
  createMockWeek({
    id: 'week-1',
    week_number: 1,
    response_deadline: new Date('2024-12-31T23:59:59Z').toISOString(),
    contemporary_title: 'The Now Sound',
    contemporary_artist: 'Modern Band',
    contemporary_year: '2024',
    classic_title: 'What\'s Going On',
    classic_artist: 'Marvin Gaye',
    classic_year: '1971',
    rs_rank: 1,
  }),
]
