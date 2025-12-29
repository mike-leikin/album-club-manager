import { createServerAuthClient } from './supabaseAuthClient'
import { createServerClient } from '@/lib/supabaseClient'

export type UserSession = {
  user: {
    id: string
    email: string
    name?: string
  }
  isCurator: boolean
}

/**
 * Get current user session and curator status
 * For use in Server Components and API routes
 */
export async function getUserSession(): Promise<UserSession | null> {
  const supabase = await createServerAuthClient()

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  // Fetch participant record to check curator status
  const serverClient = createServerClient()
  const { data: participant } = await serverClient
    .from('participants')
    .select('name, is_curator')
    .eq('auth_user_id', session.user.id)
    .single() as { data: { name: string; is_curator: boolean } | null }

  return {
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: participant?.name || session.user.email!,
    },
    isCurator: participant?.is_curator || false,
  }
}

/**
 * Require authenticated user (throws if not authenticated)
 */
export async function requireAuth(): Promise<UserSession> {
  const session = await getUserSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session
}

/**
 * Require curator permissions (throws if not curator)
 */
export async function requireCurator(): Promise<UserSession> {
  const session = await requireAuth()

  if (!session.isCurator) {
    throw new Error('Forbidden: Curator access required')
  }

  return session
}
