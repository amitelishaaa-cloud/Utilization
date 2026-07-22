'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import FormField from '@/components/ui/form-field'
import PricingFields from '@/components/ui/pricing-fields'
import type { Client, Retainer } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

type ActionFn = (
  prev: { error: string | null },
  formData: FormData,
) => Promise<{ error: string | null }>

interface RetainerFormProps {
  action: ActionFn
  clients: Pick<Client, 'id' | 'name'>[]
  defaultValues?: Partial<Retainer>
  mode: 'create' | 'edit'
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'פעיל' },
  { value: 'ended', label: 'הסתיים' },
]

export default function RetainerForm({ action, clients, defaultValues, mode }: RetainerFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null })

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <FormField label="לקוח" required>
        <select
          name="client_id"
          defaultValue={defaultValues?.client_id ?? ''}
          required
          className={INPUT_CLASS}
        >
          <option value="" disabled>בחר לקוח...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </FormField>

      <FormField label="שם רטיינר" required>
        <input
          type="text"
          name="name"
          defaultValue={defaultValues?.name ?? ''}
          required
          autoFocus={mode === 'create'}
          className={INPUT_CLASS}
          placeholder="לדוגמה: ניהול מדיה חברתית"
        />
      </FormField>

      <FormField label="שעות חודשיות" required>
        <input
          type="number"
          name="monthly_hours"
          min="0.5"
          step="0.5"
          defaultValue={defaultValues?.monthly_hours ?? ''}
          required
          className={INPUT_CLASS}
        />
      </FormField>

      <PricingFields
        fixedOptionValue="fixed_monthly"
        fixedOptionLabel="חודשי קבוע"
        fixedFieldName="monthly_fixed_price"
        fixedFieldLabel="מחיר חודשי (₪)"
        defaultPricingType={defaultValues?.pricing_type}
        defaultHourlyRate={defaultValues?.hourly_rate}
        defaultFixedValue={defaultValues?.monthly_fixed_price}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="תאריך התחלה" required>
          <input
            type="date"
            name="start_date"
            defaultValue={defaultValues?.start_date ?? ''}
            required
            className={INPUT_CLASS}
          />
        </FormField>
        <FormField label="תאריך סיום" hint="השאר ריק לרטיינר פתוח ללא תאריך סיום">
          <input
            type="date"
            name="end_date"
            defaultValue={defaultValues?.end_date ?? ''}
            className={INPUT_CLASS}
          />
        </FormField>
      </div>

      <FormField label="סטטוס" required>
        <select
          name="status"
          defaultValue={defaultValues?.status ?? 'active'}
          required
          className={INPUT_CLASS}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FormField>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'שומר...' : mode === 'create' ? 'צור רטיינר' : 'שמור שינויים'}
        </button>
        <Link
          href="/retainers"
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ביטול
        </Link>
      </div>
    </form>
  )
}
