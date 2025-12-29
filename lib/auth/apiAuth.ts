import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createServerClient as createAdminClient } from '@/lib/supabaseClient'

export async function requireCuratorApi(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Not needed for API routes
        },
        remove(name: string, options: CookieOptions) {
          // Not needed for API routes
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check curator status
  const adminClient = createAdminClient()
  const { data: participant } = await adminClient
    .from('participants')
    .select('is_curator')
    .eq('auth_user_id', session.user.id)
    .single() as { data: { is_curator: boolean } | null }

  if (!participant?.is_curator) {
    return NextResponse.json(
      { error: 'Forbidden: Curator access required' },
      { status: 403 }
    )
  }

  return null // No error, proceed
}
