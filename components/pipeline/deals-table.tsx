'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { deleteDealAction } from '@/app/(app)/pipeline/actions'
import { PIPELINE_STAGES } from '@/lib/pipeline-stages'
import type { PipelineDeal, DealStatus } from '@/lib/types'

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

export type RealizedMap = Record<string, { href: string; name: string }>

export default function DealsTable({
  deals,
  realized,
}: {
  deals: PipelineDeal[]
  realized: RealizedMap
}) {
  if (deals.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-500 text-sm mb-4">עדיין אין עסקאות.</p>
        <Link
          href="/pipeline/new"
          className="inline-flex px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          הוסף עסקה ראשונה
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">שם עסקה</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">לקוח</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">שלב</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">הסתברות</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">סטטוס</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">תמחור</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <DealRow key={deal.id} deal={deal} realized={realized[deal.id]} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DealRow({ deal, realized }: { deal: PipelineDeal; realized?: { href: string; name: string } }) {
  const [showDialog, setShowDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteDealAction(deal.id)
    })
  }

  const stageInfo = PIPELINE_STAGES[deal.current_stage]
  const probability =
    deal.probability_override !== null
      ? Math.round(deal.probability_override * 100)
      : Math.round(stageInfo.probability * 100)

  const pricingLabel =
    deal.pricing_type === 'hourly'
      ? `₪${deal.hourly_rate}/ש'`
      : `₪${deal.fixed_price} קבוע`

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          <Link href={`/pipeline/${deal.id}`} className="hover:underline">
            {deal.name}
          </Link>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {deal.clients?.name ?? (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
              לקוח יוזן בהמשך
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{stageInfo.label}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{probability}%</td>
        <td className="px-4 py-3">
          <div className="flex flex-col items-start gap-1">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[deal.status]}`}
            >
              {STATUS_LABELS[deal.status]}
            </span>
            {deal.status === 'won' &&
              (realized ? (
                <Link href={realized.href} className="text-xs text-gray-500 hover:underline">
                  {realized.name}
                </Link>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  טרם מומשה
                </span>
              ))}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{pricingLabel}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            <Link
              href={`/pipeline/${deal.id}/edit`}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              עריכה
            </Link>
            <button
              onClick={() => setShowDialog(true)}
              disabled={isPending}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isPending ? 'מוחק...' : 'מחק'}
            </button>
          </div>
        </td>
      </tr>
      {showDialog && (
        <ConfirmDialog
          title="מחיקת עסקה"
          description={`האם אתה בטוח שברצונך למחוק את העסקה "${deal.name}"? פעולה זו אינה הפיכה.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDialog(false)}
          isPending={isPending}
        />
      )}
    </>
  )
}
