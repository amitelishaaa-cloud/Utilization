export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import DealForm from '@/components/pipeline/deal-form'
import { createDealAction } from '@/app/(app)/pipeline/actions'

export default async function NewDealPage() {
  const supabase = createServerClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', getDevUserId())
    .order('name')

  return (
    <div>
      <div className="mb-8">
        <Link href="/pipeline" className="text-sm text-gray-500 hover:text-gray-700">
          ← חזרה ל-Pipeline
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">עסקה חדשה</h1>
      </div>

      {(!clients || clients.length === 0) && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          טרם הוספת לקוחות.{' '}
          <Link href="/clients/new" className="font-medium underline">
            הוסף לקוח ראשון
          </Link>{' '}
          לפני יצירת עסקה, או צור עסקה ללא לקוח ועדכן מאוחר יותר.
        </div>
      )}

      <DealForm action={createDealAction} clients={clients ?? []} mode="create" />
    </div>
  )
}
