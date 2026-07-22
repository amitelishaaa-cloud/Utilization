import NavLink from '@/components/ui/nav-link'

const navItems = [
  { href: '/clients', label: 'לקוחות' },
  { href: '/projects', label: 'פרויקטים' },
  { href: '/retainers', label: 'רטיינרים' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
