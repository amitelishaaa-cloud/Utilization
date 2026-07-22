export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import RetainersTable from '@/components/retainers/retainers-table'

export default async function RetainersPage() {
  const supabase = createServerClient()
  const { data: retainers } = await supabase
    .from('retainers')
    .select('*, clients(name)')
    .eq('user_id', getDevUserId())
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">רטיינרים</h1>
          <p className="text-sm text-gray-500 mt-1">{retainers?.length ?? 0} רטיינרים</p>
        </div>
        <Link
          href="/retainers/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + רטיינר חדש
        </Link>
      </div>
      <RetainersTable retainers={retainers ?? []} />
    </div>
  )
}
