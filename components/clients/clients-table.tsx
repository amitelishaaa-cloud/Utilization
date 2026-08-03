'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { deleteClientAction } from '@/app/(app)/clients/actions'
import { formatDate } from '@/lib/utils'
import type { Client } from '@/lib/types'

export default function ClientsTable({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-500 text-sm mb-4">עדיין אין לקוחות.</p>
        <Link
          href="/clients/new"
          className="inline-flex px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          הוסף לקוח ראשון
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">שם לקוח</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">נוצר בתאריך</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientRow({ client }: { client: Client }) {
  const [showDialog, setShowDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteClientAction(client.id)
    })
  }

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{client.name}</td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {formatDate(client.created_at)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            <Link
              href={`/clients/${client.id}/edit`}
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
          title="מחיקת לקוח"
          description={`האם אתה בטוח שברצונך למחוק את הלקוח "${client.name}"? פעולה זו אינה הפיכה.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDialog(false)}
          isPending={isPending}
        />
      )}
    </>
  )
}
