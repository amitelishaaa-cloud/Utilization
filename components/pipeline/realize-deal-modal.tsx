'use client'
import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import FormField from '@/components/ui/form-field'
import PricingFields from '@/components/ui/pricing-fields'
import {
  buildProjectDefaults,
  buildRetainerDefaults,
  NEW_CLIENT_VALUE,
} from '@/lib/deal-realization'
import type { Client, PipelineDeal } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

type ActionFn = (
  prev: { error: string | null },
  formData: FormData,
) => Promise<{ error: string | null }>

interface RealizeDealModalProps {
  deal: PipelineDeal
  clients: Pick<Client, 'id' | 'name'>[]
  action: ActionFn
}

export default function RealizeDealModal({ deal, clients, action }: RealizeDealModalProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(action, { error: null })
  const [isOpen, setIsOpen] = useState(true)

  const isProject = deal.deal_type === 'project'
  const projectDefaults = isProject ? buildProjectDefaults(deal) : null
  const retainerDefaults = isProject ? null : buildRetainerDefaults(deal)

  const [clientId, setClientId] = useState(deal.client_id ?? '')
  const [startDate, setStartDate] = useState(deal.expected_start_date)

  // Closing drops the ?realize=1 param so a refresh doesn't reopen the modal
  const close = () => {
    setIsOpen(false)
    router.replace(`/pipeline/${deal.id}`)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-base font-semibold text-gray-900">
            {isProject ? 'יצירת פרויקט מהעסקה' : 'יצירת ריטיינר מהעסקה'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            השדות מולאו מנתוני העסקה — אפשר לערוך אותם לפני היצירה.
          </p>

          <form action={formAction} className="space-y-6">
            {state.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <FormField label="לקוח" required>
              <select
                name="client_id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className={INPUT_CLASS}
              >
                <option value="">בחר לקוח</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value={NEW_CLIENT_VALUE}>+ לקוח חדש</option>
              </select>
            </FormField>

            {clientId === NEW_CLIENT_VALUE && (
              <FormField label="שם הלקוח החדש" required>
                <input
                  type="text"
                  name="new_client_name"
                  required
                  autoFocus
                  className={INPUT_CLASS}
                  placeholder="שם הלקוח כפי שיופיע במערכת"
                />
              </FormField>
            )}

            <FormField label={isProject ? 'שם הפרויקט' : 'שם הריטיינר'} required>
              <input
                type="text"
                name="name"
                defaultValue={deal.name}
                required
                className={INPUT_CLASS}
              />
            </FormField>

            {isProject ? (
              <>
                <PricingFields
                  fixedOptionValue="fixed"
                  fixedOptionLabel="מחיר קבוע"
                  fixedFieldName="fixed_price"
                  fixedFieldLabel="מחיר כולל (₪)"
                  defaultPricingType={projectDefaults!.pricing_type}
                  defaultHourlyRate={projectDefaults!.hourly_rate}
                  defaultFixedValue={projectDefaults!.fixed_price}
                />

                <FormField label="שעות מוערכות" required>
                  <input
                    type="number"
                    name="estimated_hours"
                    min="0.5"
                    step="0.5"
                    defaultValue={projectDefaults!.estimated_hours ?? ''}
                    required
                    className={INPUT_CLASS}
                  />
                </FormField>
              </>
            ) : (
              <>
                <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                  שים לב: המחיר בעסקה הוא מחיר כולל, ואילו ריטיינר מתומחר לפי חודש. יש להזין
                  את המחיר החודשי בעצמך.
                </p>

                <PricingFields
                  fixedOptionValue="fixed_monthly"
                  fixedOptionLabel="מחיר חודשי קבוע"
                  fixedFieldName="monthly_fixed_price"
                  fixedFieldLabel="מחיר לחודש (₪)"
                  defaultPricingType={retainerDefaults!.pricing_type}
                  defaultHourlyRate={retainerDefaults!.hourly_rate}
                  defaultFixedValue={retainerDefaults!.monthly_fixed_price}
                />

                <FormField label="שעות חודשיות" required>
                  <input
                    type="number"
                    name="monthly_hours"
                    min="0.5"
                    step="0.5"
                    defaultValue={retainerDefaults!.monthly_hours ?? ''}
                    required
                    className={INPUT_CLASS}
                  />
                </FormField>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="תאריך התחלה" required>
                <input
                  type="date"
                  name="start_date"
                  defaultValue={deal.expected_start_date}
                  required
                  className={INPUT_CLASS}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormField>
              <FormField
                label={isProject ? 'תאריך סיום' : 'תאריך סיום (אופציונלי)'}
                required={isProject}
              >
                <input
                  type="date"
                  name="end_date"
                  defaultValue={deal.expected_end_date ?? ''}
                  required={isProject}
                  className={INPUT_CLASS}
                  min={startDate || undefined}
                />
              </FormField>
            </div>

            {isProject && (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="is_end_date_estimated"
                  defaultChecked={projectDefaults!.is_end_date_estimated}
                  className="accent-gray-900"
                />
                תאריך הסיום הוא הערכה
              </label>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                לא עכשיו
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'יוצר...' : isProject ? 'צור פרויקט' : 'צור ריטיינר'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
