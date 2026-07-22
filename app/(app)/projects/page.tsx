export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import ProjectsTable from '@/components/projects/projects-table'

export default async function ProjectsPage() {
  const supabase = createServerClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('user_id', getDevUserId())
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">פרויקטים</h1>
          <p className="text-sm text-gray-500 mt-1">{projects?.length ?? 0} פרויקטים</p>
        </div>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + פרויקט חדש
        </Link>
      </div>
      <ProjectsTable projects={projects ?? []} />
    </div>
  )
}
