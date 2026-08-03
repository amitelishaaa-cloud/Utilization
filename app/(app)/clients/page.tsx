export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient, requireUser } from '@/lib/supabase/server'
import ClientsTable from '@/components/clients/clients-table'

export default async function ClientsPage() {
  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">לקוחות</h1>
          <p className="text-sm text-gray-500 mt-1">{clients?.length ?? 0} לקוחות</p>
        </div>
        <Link
          href="/clients/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + לקוח חדש
        </Link>
      </div>
      <ClientsTable clients={clients ?? []} />
    </div>
  )
}
