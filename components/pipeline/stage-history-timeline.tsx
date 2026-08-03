import { createServerClient } from '@/lib/supabase/server'
import { PIPELINE_STAGES } from '@/lib/pipeline-stages'
import type { PipelineStage } from '@/lib/types'

export default async function StageHistoryTimeline({ dealId }: { dealId: string }) {
  // Scoped by the RLS policy on pipeline_stage_history, which joins through
  // pipeline_deals — the table has no user_id column of its own.
  const supabase = await createServerClient()
  const { data: history } = await supabase
    .from('pipeline_stage_history')
    .select('*')
    .eq('deal_id', dealId)
    .order('changed_at', { ascending: true })

  if (!history || history.length === 0) {
    return <p className="text-sm text-gray-500">אין היסטוריית שלבים.</p>
  }

  return (
    <div>
      {history.map((entry, index) => {
        const toStageInfo = PIPELINE_STAGES[entry.to_stage as PipelineStage]
        const fromStageInfo = entry.from_stage
          ? PIPELINE_STAGES[entry.from_stage as PipelineStage]
          : null

        const dateStr = new Date(entry.changed_at).toLocaleDateString('he-IL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        const isLast = index === history.length - 1

        return (
          <div key={entry.id} className="flex gap-4 relative">
            {!isLast && (
              <div className="absolute start-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
            )}
            <div className="mt-1 h-6 w-6 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
            <div className="pb-5">
              <p className="text-sm font-medium text-gray-900">
                {fromStageInfo
                  ? `${fromStageInfo.label} ← ${toStageInfo.label}`
                  : `נפתח בשלב: ${toStageInfo.label}`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
