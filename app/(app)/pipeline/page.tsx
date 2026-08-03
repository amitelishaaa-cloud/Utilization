export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient, requireUser } from '@/lib/supabase/server'
import DealsTable from '@/components/pipeline/deals-table'

export default async function PipelinePage() {
  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { data: deals } = await supabase
    .from('pipeline_deals')
    .select('*, clients(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // Which won deals already produced a project/retainer — drives the "טרם מומשה" badge
  const wonIds = (deals ?? []).filter((d) => d.status === 'won').map((d) => d.id)
  const realized: Record<string, { href: string; name: string }> = {}

  if (wonIds.length > 0) {
    const [{ data: projects }, { data: retainers }] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, source_deal_id')
        .eq('user_id', userId)
        .in('source_deal_id', wonIds),
      supabase
        .from('retainers')
        .select('id, name, source_deal_id')
        .eq('user_id', userId)
        .in('source_deal_id', wonIds),
    ])

    for (const p of projects ?? []) realized[p.source_deal_id] = { href: `/projects/${p.id}/edit`, name: p.name }
    for (const r of retainers ?? []) realized[r.source_deal_id] = { href: `/retainers/${r.id}/edit`, name: r.name }
  }

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
      <DealsTable deals={deals ?? []} realized={realized} />
    </div>
  )
}
