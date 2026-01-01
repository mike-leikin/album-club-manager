import { http, HttpResponse } from 'msw'

export const resendHandlers = [
  http.post('https://api.resend.com/emails', async ({ request }) => {
    const body = (await request.json()) as any
    return HttpResponse.json({
      id: `email-${Date.now()}`,
      from: body.from,
      to: body.to,
      subject: body.subject,
      created_at: new Date().toISOString(),
    })
  }),
]
