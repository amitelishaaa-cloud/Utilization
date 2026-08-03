export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient, requireUser } from '@/lib/supabase/server'
import StageHistoryTimeline from '@/components/pipeline/stage-history-timeline'
import RealizeDealModal from '@/components/pipeline/realize-deal-modal'
import DateRange from '@/components/ui/date-range'
import { PIPELINE_STAGES } from '@/lib/pipeline-stages'
import { realizeDealAction } from '@/app/(app)/pipeline/actions'
import { formatDate } from '@/lib/utils'
import type { PipelineStage, DealStatus, PipelineDeal } from '@/lib/types'

const STATUS_LABELS: Record<DealStatus, string> = {
  active: 'פעיל',
  won:    'נסגר בהצלחה',
  lost:   'נפל',
}

const STATUS_COLORS: Record<DealStatus, string> = {
  active: 'bg-blue-100 text-blue-700',
  won:    'bg-green-100 text-green-700',
  lost:   'bg-gray-100 text-gray-500',
}

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ realize?: string }>
}) {
  const { id } = await params
  const { realize } = await searchParams

  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { data: deal } = await supabase
    .from('pipeline_deals')
    .select('*, clients(name)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!deal) notFound()

  const isProject = deal.deal_type === 'project'
  const targetPath = isProject ? 'projects' : 'retainers'

  // A won deal is "realized" once a project/retainer points back at it
  const [{ data: realized }, { data: clients }] = await Promise.all([
    supabase
      .from(targetPath)
      .select('id, name')
      .eq('source_deal_id', id)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('clients').select('id, name').eq('user_id', userId).order('name'),
  ])

  const canRealize = deal.status === 'won' && !realized
  const realizeLabel = isProject ? 'צור פרויקט' : 'צור ריטיינר'

  const stageInfo = PIPELINE_STAGES[deal.current_stage as PipelineStage]
  const probability =
    deal.probability_override !== null
      ? Math.round((deal.probability_override as number) * 100)
      : Math.round(stageInfo.probability * 100)

  const pricingLabel =
    deal.pricing_type === 'hourly'
      ? `₪${deal.hourly_rate} לשעה`
      : `₪${deal.fixed_price} (מחיר קבוע)`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/pipeline" className="text-sm text-gray-500 hover:text-gray-700">
            ← חזרה ל-Pipeline
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{deal.name}</h1>
          {deal.clients?.name ? (
            <p className="text-sm text-gray-500 mt-1">{deal.clients.name}</p>
          ) : (
            <p className="text-sm text-gray-400 mt-1">לקוח יוזן בהמשך</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canRealize && (
            <Link
              href={`/pipeline/${id}?realize=1`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              {realizeLabel}
            </Link>
          )}
          <Link
            href={`/pipeline/${id}/edit`}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            עריכה
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">פרטי עסקה</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">שלב</span>
              <span className="font-medium text-gray-900">{stageInfo.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">הסתברות</span>
              <span className="font-medium text-gray-900">
                {probability}%
                {deal.probability_override !== null && (
                  <span className="text-xs text-gray-400 mr-1">(מותאם אישית)</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">סטטוס</span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[deal.status as DealStatus]}`}
              >
                {STATUS_LABELS[deal.status as DealStatus]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">תמחור</span>
              <span className="font-medium text-gray-900">{pricingLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">שעות מוערכות</span>
              <span className="font-medium text-gray-900">{deal.estimated_hours}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">תאריכים</span>
              <span className="font-medium text-gray-900">
                <DateRange
                  start={deal.expected_start_date}
                  end={deal.expected_end_date}
                />
              </span>
            </div>
            {deal.closed_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">נסגר ב</span>
                <span className="font-medium text-gray-900">
                  {formatDate(deal.closed_at)}
                </span>
              </div>
            )}
            {realized && (
              <div className="flex justify-between">
                <span className="text-gray-500">{isProject ? 'פרויקט שנוצר' : 'ריטיינר שנוצר'}</span>
                <Link
                  href={`/${targetPath}/${realized.id}/edit`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {realized.name}
                </Link>
              </div>
            )}
            {canRealize && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                העסקה נסגרה בהצלחה אך טרם מומשה — השעות שלה כבר לא נספרות בתחזית הניצול.
              </div>
            )}
          </div>
        </div>

        {/* Stage history */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">היסטוריית שלבים</h2>
          <StageHistoryTimeline dealId={id} />
        </div>
      </div>

      {canRealize && realize === '1' && (
        <RealizeDealModal
          deal={deal as PipelineDeal}
          clients={clients ?? []}
          action={realizeDealAction.bind(null, id)}
        />
      )}
    </div>
  )
}
