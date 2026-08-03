import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicPath } from '@/lib/auth/routes'

/** Redirect while carrying over any session cookies refreshed on this request. */
function redirectTo(path: string, request: NextRequest, refreshed: NextResponse) {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = ''

  const response = NextResponse.redirect(url)
  refreshed.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
  return response
}

/**
 * Refreshes the Supabase session on every request and redirects optimistically.
 * This is not the authorization boundary — requireUser() in the app layout and
 * RLS in the database are. See app/(app)/layout.tsx.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookiesToSet => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = isPublicPath(request.nextUrl.pathname)

  if (!user && !isPublic) return redirectTo('/login', request, response)
  if (user && isPublic) return redirectTo('/cockpit', request, response)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
