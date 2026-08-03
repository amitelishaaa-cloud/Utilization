import FormField from '@/components/ui/form-field'
import { PRIORITIES, PRIORITY_OPTIONS } from '@/lib/priority'
import type { Priority } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

interface MetaFieldsProps {
  defaultNotes?: string | null
  defaultPriority?: Priority | null
  defaultReminderDate?: string | null
  /** retainers מקבלת notes בלבד — אין לה עמודות priority/reminder_date */
  showPriorityAndReminder?: boolean
}

/**
 * שדות המידע המשותפים לכל הישויות: הערות, עדיפות, תאריך תזכורת.
 * כולם אופציונליים ואף אחד מהם לא נכנס למנוע החישוב.
 */
export default function MetaFields({
  defaultNotes,
  defaultPriority,
  defaultReminderDate,
  showPriorityAndReminder = true,
}: MetaFieldsProps) {
  return (
    <div className="space-y-6">
      {showPriorityAndReminder && (
        <div className="grid grid-cols-2 gap-4">
          <FormField label="עדיפות" hint="אופציונלי">
            <select
              name="priority"
              defaultValue={defaultPriority ?? ''}
              className={INPUT_CLASS}
            >
              <option value="">ללא עדיפות</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p} — {PRIORITIES[p].label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="תאריך תזכורת" hint="אופציונלי — לשימוש עתידי, אין שליחה אוטומטית">
            <input
              type="date"
              name="reminder_date"
              defaultValue={defaultReminderDate ?? ''}
              className={INPUT_CLASS}
            />
          </FormField>
        </div>
      )}

      <FormField label="הערות" hint="אופציונלי">
        <textarea
          name="notes"
          rows={4}
          defaultValue={defaultNotes ?? ''}
          className={INPUT_CLASS}
          placeholder="הערות חופשיות..."
        />
      </FormField>
    </div>
  )
}
