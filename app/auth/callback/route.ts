import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitRedirect = searchParams.get('redirect')

  if (code) {
    const cookieStore = request.cookies
    let finalRedirect = explicitRedirect || '/choose-role'

    const response = NextResponse.redirect(`${origin}${finalRedirect}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // If no explicit redirect, check if user is a curator
      if (!explicitRedirect) {
        const { data: participant } = await supabase
          .from('participants')
          .select('is_curator')
          .eq('auth_user_id', data.session.user.id)
          .single()

        if (participant?.is_curator) {
          finalRedirect = '/choose-role'
        } else {
          finalRedirect = '/dashboard'
        }

        // Update redirect URL if it changed
        return NextResponse.redirect(`${origin}${finalRedirect}`, {
          headers: response.headers,
        })
      }

      return response
    }
  }

  // Auth failed - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
