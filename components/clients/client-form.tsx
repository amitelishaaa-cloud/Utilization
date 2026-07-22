'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import FormField from '@/components/ui/form-field'
import type { Client } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

type ActionFn = (
  prev: { error: string | null },
  formData: FormData,
) => Promise<{ error: string | null }>

interface ClientFormProps {
  action: ActionFn
  defaultValues?: Partial<Client>
  mode: 'create' | 'edit'
}

export default function ClientForm({ action, defaultValues, mode }: ClientFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null })

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <FormField label="שם לקוח" required>
        <input
          type="text"
          name="name"
          defaultValue={defaultValues?.name ?? ''}
          required
          autoFocus
          className={INPUT_CLASS}
          placeholder="לדוגמה: חברת ABC"
        />
      </FormField>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'שומר...' : mode === 'create' ? 'צור לקוח' : 'שמור שינויים'}
        </button>
        <Link
          href="/clients"
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ביטול
        </Link>
      </div>
    </form>
  )
}
