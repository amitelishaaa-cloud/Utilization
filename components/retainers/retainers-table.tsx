'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { deleteRetainerAction } from '@/app/(app)/retainers/actions'
import type { Retainer, RetainerStatus } from '@/lib/types'

const STATUS_LABELS: Record<RetainerStatus, string> = {
  active: 'פעיל',
  ended: 'הסתיים',
}

const STATUS_COLORS: Record<RetainerStatus, string> = {
  active: 'bg-green-100 text-green-700',
  ended: 'bg-gray-100 text-gray-500',
}

export default function RetainersTable({ retainers }: { retainers: Retainer[] }) {
  if (retainers.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-500 text-sm mb-4">עדיין אין רטיינרים.</p>
        <Link
          href="/retainers/new"
          className="inline-flex px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          הוסף רטיינר ראשון
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">שם רטיינר</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">לקוח</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">סטטוס</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">שעות/חודש</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">תאריכים</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">תמחור</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {retainers.map((retainer) => (
            <RetainerRow key={retainer.id} retainer={retainer} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RetainerRow({ retainer }: { retainer: Retainer }) {
  const [showDialog, setShowDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteRetainerAction(retainer.id)
    })
  }

  const pricingLabel =
    retainer.pricing_type === 'hourly'
      ? `₪${retainer.hourly_rate}/ש'`
      : `₪${retainer.monthly_fixed_price}/חודש`

  const datesLabel = retainer.end_date
    ? `${retainer.start_date} – ${retainer.end_date}`
    : `${retainer.start_date} – פתוח`

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{retainer.name}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{retainer.clients?.name ?? '—'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[retainer.status]}`}>
            {STATUS_LABELS[retainer.status]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{retainer.monthly_hours}</td>
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{datesLabel}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{pricingLabel}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            <Link
              href={`/retainers/${retainer.id}/edit`}
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
          title="מחיקת רטיינר"
          description={`האם אתה בטוח שברצונך למחוק את הרטיינר "${retainer.name}"? פעולה זו אינה הפיכה.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDialog(false)}
          isPending={isPending}
        />
      )}
    </>
  )
}
