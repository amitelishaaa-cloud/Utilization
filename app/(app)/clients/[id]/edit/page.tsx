export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient, requireUser } from '@/lib/supabase/server'
import ClientForm from '@/components/clients/client-form'
import { updateClientAction } from '../../actions'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!client) notFound()

  const action = updateClientAction.bind(null, id)

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← לקוחות
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">עריכת לקוח</h1>
      </div>
      <ClientForm action={action} defaultValues={client} mode="edit" />
    </div>
  )
}
