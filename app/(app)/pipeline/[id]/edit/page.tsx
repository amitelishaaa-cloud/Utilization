export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import DealForm from '@/components/pipeline/deal-form'
import { updateDealAction } from '@/app/(app)/pipeline/actions'

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createServerClient()
  const [{ data: deal }, { data: clients }] = await Promise.all([
    supabase
      .from('pipeline_deals')
      .select('*, clients(name)')
      .eq('id', id)
      .eq('user_id', getDevUserId())
      .single(),
    supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', getDevUserId())
      .order('name'),
  ])

  if (!deal) notFound()

  const action = updateDealAction.bind(null, id)

  return (
    <div>
      <div className="mb-8">
        <Link href={`/pipeline/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← חזרה לפרטי עסקה
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">עריכת עסקה</h1>
      </div>
      <DealForm
        action={action}
        clients={clients ?? []}
        defaultValues={deal}
        mode="edit"
      />
    </div>
  )
}
