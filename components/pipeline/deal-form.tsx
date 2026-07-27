'use client'
import { useActionState, useState } from 'react'
import Link from 'next/link'
import FormField from '@/components/ui/form-field'
import PricingFields from '@/components/ui/pricing-fields'
import { PIPELINE_STAGES } from '@/lib/pipeline-stages'
import type { Client, DealType, PipelineDeal } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

type ActionFn = (
  prev: { error: string | null },
  formData: FormData,
) => Promise<{ error: string | null }>

const STATUS_OPTIONS = [
  { value: 'active', label: 'פעיל' },
  { value: 'won',    label: 'נסגר בהצלחה' },
  { value: 'lost',   label: 'נפל' },
]

interface DealFormProps {
  action: ActionFn
  clients: Pick<Client, 'id' | 'name'>[]
  defaultValues?: Partial<PipelineDeal>
  mode: 'create' | 'edit'
}

export default function DealForm({ action, clients, defaultValues, mode }: DealFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null })
  const [dealType, setDealType] = useState<DealType>(defaultValues?.deal_type ?? 'project')

  const defaultProbabilityPct =
    defaultValues?.probability_override != null
      ? Math.round(defaultValues.probability_override * 100)
      : ''

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <FormField label="לקוח">
        <select
          name="client_id"
          defaultValue={defaultValues?.client_id ?? ''}
          className={INPUT_CLASS}
        >
          <option value="">ללא לקוח</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </FormField>

      <FormField label="שם העסקה" required>
        <input
          type="text"
          name="name"
          defaultValue={defaultValues?.name ?? ''}
          required
          autoFocus={mode === 'create'}
          className={INPUT_CLASS}
          placeholder="לדוגמה: אתר אינטרנט לחברת XYZ"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="שלב בצינור" required>
          <select
            name="current_stage"
            defaultValue={defaultValues?.current_stage ?? 'inquiry'}
            required
            className={INPUT_CLASS}
          >
            {(Object.entries(PIPELINE_STAGES) as [string, { label: string; probability: number }][]).map(
              ([key, { label, probability }]) => (
                <option key={key} value={key}>
                  {label} ({Math.round(probability * 100)}%)
                </option>
              ),
            )}
          </select>
        </FormField>

        <FormField label="הסתברות אישית (%)" hint="אופציונלי — ברירת מחדל לפי שלב">
          <input
            type="number"
            name="probability_override"
            min="0"
            max="100"
            step="1"
            defaultValue={defaultProbabilityPct}
            className={INPUT_CLASS}
            placeholder="ברירת מחדל לפי שלב"
          />
        </FormField>
      </div>

      {/* סוג עסקה — radio buttons, כדפוס PricingFields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          סוג עסקה <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-6">
          {([
            { value: 'project', label: 'פרויקט' },
            { value: 'retainer', label: 'ריטיינר' },
          ] as { value: DealType; label: string }[]).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="deal_type"
                value={opt.value}
                checked={dealType === opt.value}
                onChange={() => setDealType(opt.value)}
                className="accent-gray-900"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <PricingFields
        fixedOptionValue="fixed"
        fixedOptionLabel="מחיר קבוע"
        fixedFieldName="fixed_price"
        fixedFieldLabel="מחיר כולל (₪)"
        defaultPricingType={defaultValues?.pricing_type}
        defaultHourlyRate={defaultValues?.hourly_rate}
        defaultFixedValue={defaultValues?.fixed_price}
      />

      {/* שעות — unmount מלא של branch לא פעיל כדי ש-required לא יחסום */}
      {dealType === 'project' ? (
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
      ) : (
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
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="תאריך התחלה צפוי" required>
          <input
            type="date"
            name="expected_start_date"
            defaultValue={defaultValues?.expected_start_date ?? ''}
            required
            className={INPUT_CLASS}
          />
        </FormField>
        <FormField
          label={dealType === 'retainer' ? 'תאריך סיום צפוי (אופציונלי)' : 'תאריך סיום צפוי'}
          required={dealType === 'project'}
        >
          <input
            type="date"
            name="expected_end_date"
            defaultValue={defaultValues?.expected_end_date ?? ''}
            required={dealType === 'project'}
            className={INPUT_CLASS}
          />
        </FormField>
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
          {isPending ? 'שומר...' : mode === 'create' ? 'צור עסקה' : 'שמור שינויים'}
        </button>
        <Link
          href="/pipeline"
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ביטול
        </Link>
      </div>
    </form>
  )
}
