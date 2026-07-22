export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import RetainerForm from '@/components/retainers/retainer-form'
import { createRetainerAction } from '../actions'

export default async function NewRetainerPage() {
  const supabase = createServerClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', getDevUserId())
    .order('name')

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/retainers" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← רטיינרים
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">רטיינר חדש</h1>
      </div>
      {(!clients || clients.length === 0) ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-lg">
          <p className="text-sm text-amber-800">
            כדי ליצור רטיינר, קודם צריך{' '}
            <Link href="/clients/new" className="font-medium underline">להוסיף לפחות לקוח אחד</Link>.
          </p>
        </div>
      ) : (
        <RetainerForm action={createRetainerAction} clients={clients} mode="create" />
      )}
    </div>
  )
}
