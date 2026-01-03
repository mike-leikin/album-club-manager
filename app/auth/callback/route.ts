import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitRedirect = searchParams.get('redirect')

  if (code) {
    const cookieStore = request.cookies

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Will be set below
          },
          remove(name: string, options: CookieOptions) {
            // Will be set below
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Determine redirect based on user role and explicit redirect param
      let finalRedirect = explicitRedirect || '/choose-role'

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
      }

      const response = NextResponse.redirect(`${origin}${finalRedirect}`)

      // Set cookies in response
      const sessionCookies = await supabase.auth.getSession()

      return response
    }
  }

  // Auth failed - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
