import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export function getDevUserId(): string {
  const id = process.env.DEV_USER_ID
  if (!id) throw new Error('DEV_USER_ID is not set in .env.local')
  return id
}
