import NavLink from '@/components/ui/nav-link'
import { requireUser } from '@/lib/supabase/server'
import { signOutAction } from '@/app/(auth)/actions'

const navItems = [
  { href: '/cockpit', label: 'לוח בקרה' },
  { href: '/clients', label: 'לקוחות' },
  { href: '/projects', label: 'פרויקטים' },
  { href: '/retainers', label: 'רטיינרים' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/settings', label: 'הגדרות' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The authoritative auth gate — proxy.ts is only an optimistic check.
  const user = await requireUser()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 flex-shrink-0 bg-white border-e border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <p className="text-base font-bold text-gray-900">Utilization</p>
          <p className="text-xs text-gray-500 mt-0.5">ניהול ניצולת</p>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {navItems.map(({ href, label }) => (
              <li key={href}>
                <NavLink href={href} label={label} />
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-3 border-t border-gray-200">
          <p className="px-3 pb-2 text-xs text-gray-500 truncate" title={user.email}>
            {user.email}
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full text-start px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              התנתקות
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
