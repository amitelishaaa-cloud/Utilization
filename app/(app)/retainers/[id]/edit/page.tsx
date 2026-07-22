export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import RetainerForm from '@/components/retainers/retainer-form'
import { updateRetainerAction } from '../../actions'

export default async function EditRetainerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServerClient()
  const userId = getDevUserId()

  const [{ data: retainer }, { data: clients }] = await Promise.all([
    supabase.from('retainers').select('*').eq('id', id).eq('user_id', userId).single(),
    supabase.from('clients').select('id, name').eq('user_id', userId).order('name'),
  ])

  if (!retainer) notFound()

  const action = updateRetainerAction.bind(null, id)

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/retainers" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← רטיינרים
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">עריכת רטיינר</h1>
      </div>
      <RetainerForm action={action} clients={clients ?? []} defaultValues={retainer} mode="edit" />
    </div>
  )
}
