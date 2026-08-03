/**
 * Routes reachable without a session. Everything else is protected —
 * including `/`, which redirects by session state in app/page.tsx.
 */
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password']

export function isPublicPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return PUBLIC_PATHS.includes(normalized)
}
