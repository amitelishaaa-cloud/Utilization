'use client'
import { useActionState } from 'react'
import FormField from '@/components/ui/form-field'
import { updateSettingsAction } from '@/app/(app)/settings/actions'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

export default function SettingsForm({
  defaultWeeklyHours,
  worksFriday,
}: {
  defaultWeeklyHours: number
  worksFriday: boolean
}) {
  const [state, formAction, isPending] = useActionState(updateSettingsAction, { error: null })

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <FormField
        label="קיבולת שבועית (שעות)"
        required
        hint="שעות עבודה זמינות בשבוע רגיל, ראשון עד חמישי — לפני תוספת יום שישי"
      >
        <input
          type="number"
          name="default_weekly_hours"
          min="0.5"
          step="0.5"
          defaultValue={defaultWeeklyHours}
          required
          className={INPUT_CLASS}
        />
      </FormField>

      <FormField
        label="עובד/ת גם ביום שישי"
        hint="מוסיף 4 שעות קיבולת לכל שבוע רגיל (חצי יום). שבועות עם חריגת קיבולת ספציפית אינם מושפעים."
      >
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            name="works_friday"
            defaultChecked={worksFriday}
            className="accent-gray-900"
          />
          כן, כולל יום שישי
        </label>
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {isPending ? 'שומר…' : 'שמירה'}
      </button>
    </form>
  )
}
