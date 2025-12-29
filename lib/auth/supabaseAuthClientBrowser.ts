import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

// Client-side auth client (for use in browser/client components)
export function createAuthClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
