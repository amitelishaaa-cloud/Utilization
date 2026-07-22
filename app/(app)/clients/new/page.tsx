import Link from 'next/link'
import ClientForm from '@/components/clients/client-form'
import { createClientAction } from '../actions'

export default function NewClientPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← לקוחות
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">לקוח חדש</h1>
      </div>
      <ClientForm action={createClientAction} mode="create" />
    </div>
  )
}
