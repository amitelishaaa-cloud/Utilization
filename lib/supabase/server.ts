import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

/**
 * Cookie-bound Supabase client using the anon key. Every query it issues is
 * subject to RLS — there is deliberately no service-role path in this app.
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: cookiesToSet => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Components cannot write cookies. proxy.ts refreshes the
            // session on every request, so dropping the write here is safe.
          }
        },
      },
    },
  )
}

/**
 * The authoritative auth gate. Call it at the top of every page and Server
 * Action — Server Actions are reachable by direct POST, so proxy.ts alone is
 * not enough. Call it once per request and reuse the result.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  return user
}
