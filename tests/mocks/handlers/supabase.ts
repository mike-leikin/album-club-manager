import { http, HttpResponse } from 'msw'
import { mockParticipants } from '../data/participants'
import { mockReviews } from '../data/reviews'
import { mockWeeks } from '../data/weeks'

const SUPABASE_URL = 'https://test.supabase.co'

export const supabaseHandlers = [
  // GET participants
  http.get(`${SUPABASE_URL}/rest/v1/participants`, ({ request }) => {
    const url = new URL(request.url)
    const includeDeleted = url.searchParams.get('deleted_at') !== 'is.null'

    const filtered = includeDeleted
      ? mockParticipants
      : mockParticipants.filter((p) => p.deleted_at === null)

    return HttpResponse.json(filtered)
  }),

  // POST participants
  http.post(`${SUPABASE_URL}/rest/v1/participants`, async ({ request }) => {
    const body = (await request.json()) as any
    const newParticipant = {
      id: `participant-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    return HttpResponse.json([newParticipant], { status: 201 })
  }),

  // PATCH participants
  http.patch(`${SUPABASE_URL}/rest/v1/participants`, async ({ request }) => {
    const body = (await request.json()) as any
    return HttpResponse.json(
      [
        {
          ...mockParticipants[0],
          ...body,
          updated_at: new Date().toISOString(),
        },
      ],
      { status: 200 }
    )
  }),

  // DELETE participants (soft delete)
  http.delete(`${SUPABASE_URL}/rest/v1/participants`, async () => {
    return HttpResponse.json(
      [
        {
          ...mockParticipants[0],
          deleted_at: new Date().toISOString(),
        },
      ],
      { status: 200 }
    )
  }),

  // GET reviews
  http.get(`${SUPABASE_URL}/rest/v1/reviews`, ({ request }) => {
    const url = new URL(request.url)
    const weekNumber = url.searchParams.get('week_number')

    const filtered = weekNumber
      ? mockReviews.filter((r) => r.week_number === parseInt(weekNumber))
      : mockReviews

    return HttpResponse.json(filtered)
  }),

  // POST reviews
  http.post(`${SUPABASE_URL}/rest/v1/reviews`, async ({ request }) => {
    const body = (await request.json()) as any
    const newReviews = Array.isArray(body) ? body : [body]
    const created = newReviews.map((r, i) => ({
      id: `review-${Date.now()}-${i}`,
      ...r,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    return HttpResponse.json(created, { status: 201 })
  }),

  // PATCH reviews
  http.patch(`${SUPABASE_URL}/rest/v1/reviews`, async ({ request }) => {
    const body = (await request.json()) as any
    return HttpResponse.json(
      [
        {
          ...mockReviews[0],
          ...body,
          updated_at: new Date().toISOString(),
        },
      ],
      { status: 200 }
    )
  }),

  // DELETE reviews
  http.delete(`${SUPABASE_URL}/rest/v1/reviews`, async () => {
    return HttpResponse.json([], { status: 204 })
  }),

  // GET weeks
  http.get(`${SUPABASE_URL}/rest/v1/weeks`, ({ request }) => {
    const url = new URL(request.url)
    const weekNumber = url.searchParams.get('week_number')

    const filtered = weekNumber
      ? mockWeeks.filter((w) => w.week_number === parseInt(weekNumber))
      : mockWeeks

    return HttpResponse.json(filtered)
  }),

  // POST weeks (upsert)
  http.post(`${SUPABASE_URL}/rest/v1/weeks`, async ({ request }) => {
    const body = (await request.json()) as any
    const newWeek = {
      id: `week-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
    }
    return HttpResponse.json([newWeek], { status: 201 })
  }),
]
