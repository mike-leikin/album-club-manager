import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if needed
  const { data: { session } } = await supabase.auth.getSession()

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    if (!session) {
      // Not authenticated - redirect to login
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check curator status
    const { data: participant } = await supabase
      .from('participants')
      .select('is_curator')
      .eq('auth_user_id', session.user.id)
      .single()

    if (!participant?.is_curator) {
      // Authenticated but not curator - show access denied
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // If accessing login page while authenticated, redirect to admin
  if (pathname === '/login' && session) {
    const { data: participant } = await supabase
      .from('participants')
      .select('is_curator')
      .eq('auth_user_id', session.user.id)
      .single()

    if (participant?.is_curator) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    '/my-reviews/:path*', // Future enhancement
  ],
}
