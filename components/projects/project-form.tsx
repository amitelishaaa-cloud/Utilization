'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import FormField from '@/components/ui/form-field'
import PricingFields from '@/components/ui/pricing-fields'
import type { Client, Project } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

type ActionFn = (
  prev: { error: string | null },
  formData: FormData,
) => Promise<{ error: string | null }>

interface ProjectFormProps {
  action: ActionFn
  clients: Pick<Client, 'id' | 'name'>[]
  defaultValues?: Partial<Project>
  mode: 'create' | 'edit'
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'פעיל' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
]

export default function ProjectForm({ action, clients, defaultValues, mode }: ProjectFormProps) {
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

      <FormField label="שם פרויקט" required>
        <input
          type="text"
          name="name"
          defaultValue={defaultValues?.name ?? ''}
          required
          autoFocus={mode === 'create'}
          className={INPUT_CLASS}
          placeholder="לדוגמה: בניית אתר לקוח"
        />
      </FormField>

      <PricingFields
        fixedOptionValue="fixed"
        fixedOptionLabel="מחיר קבוע"
        fixedFieldName="fixed_price"
        fixedFieldLabel="מחיר כולל (₪)"
        defaultPricingType={defaultValues?.pricing_type}
        defaultHourlyRate={defaultValues?.hourly_rate}
        defaultFixedValue={defaultValues?.fixed_price}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="שעות מוערכות" required>
          <input
            type="number"
            name="estimated_hours"
            min="0.5"
            step="0.5"
            defaultValue={defaultValues?.estimated_hours ?? ''}
            required
            className={INPUT_CLASS}
          />
        </FormField>
        {mode === 'edit' && (
          <FormField label="שעות בפועל" hint="אופציונלי">
            <input
              type="number"
              name="actual_hours"
              min="0"
              step="0.5"
              defaultValue={defaultValues?.actual_hours ?? ''}
              className={INPUT_CLASS}
            />
          </FormField>
        )}
      </div>

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
        <div className="space-y-1.5">
          <FormField label="תאריך סיום" required>
            <input
              type="date"
              name="end_date"
              defaultValue={defaultValues?.end_date ?? ''}
              required
              className={INPUT_CLASS}
            />
          </FormField>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              name="is_end_date_estimated"
              defaultChecked={defaultValues?.is_end_date_estimated ?? false}
              className="accent-gray-900"
            />
            לא בטוח בתאריך? סמן שזו הערכה
          </label>
        </div>
      </div>

      {mode === 'edit' && (
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
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'שומר...' : mode === 'create' ? 'צור פרויקט' : 'שמור שינויים'}
        </button>
        <Link
          href="/projects"
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ביטול
        </Link>
      </div>
    </form>
  )
}
