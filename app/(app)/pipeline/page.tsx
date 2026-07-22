export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import DealsTable from '@/components/pipeline/deals-table'

export default async function PipelinePage() {
  const supabase = createServerClient()
  const { data: deals } = await supabase
    .from('pipeline_deals')
    .select('*, clients(name)')
    .eq('user_id', getDevUserId())
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">{deals?.length ?? 0} עסקאות</p>
        </div>
        <Link
          href="/pipeline/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + עסקה חדשה
        </Link>
      </div>
      <DealsTable deals={deals ?? []} />
    </div>
  )
}
