export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import ProjectForm from '@/components/projects/project-form'
import { updateProjectAction } from '../../actions'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServerClient()
  const userId = getDevUserId()

  const [{ data: project }, { data: clients }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).eq('user_id', userId).single(),
    supabase.from('clients').select('id, name').eq('user_id', userId).order('name'),
  ])

  if (!project) notFound()

  const action = updateProjectAction.bind(null, id)

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← פרויקטים
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">עריכת פרויקט</h1>
      </div>
      <ProjectForm action={action} clients={clients ?? []} defaultValues={project} mode="edit" />
    </div>
  )
}
