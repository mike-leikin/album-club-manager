import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './lib/types/database'

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

    // Check curator status using service role to bypass RLS
    const adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: participant } = await adminClient
      .from('participants')
      .select('is_curator')
      .eq('auth_user_id', session.user.id)
      .single() as { data: { is_curator: boolean } | null }

    if (!participant?.is_curator) {
      // Authenticated but not curator - show access denied
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Protect /dashboard route (requires authentication, not curator-only)
  if (pathname.startsWith('/dashboard')) {
    // In development mode, allow bypassing authentication with ?dev=true
    const isDevelopment = process.env.NODE_ENV === 'development'
    const devBypass = request.nextUrl.searchParams.get('dev') === 'true'

    if (!session && !(isDevelopment && devBypass)) {
      // Not authenticated - redirect to login
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If accessing login page while authenticated, redirect to dashboard
  // (Curators can navigate to /admin from their dashboard)
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    '/dashboard/:path*',
  ],
}
