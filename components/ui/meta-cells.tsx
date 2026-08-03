import { PRIORITIES } from '@/lib/priority'
import type { Priority } from '@/lib/types'

/** badge עדיפות לטבלאות — classes סטטיים מתוך PRIORITIES */
export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (priority === null) return <span className="text-sm text-gray-400">—</span>

  const { label, badge } = PRIORITIES[priority]
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>
      {priority} — {label}
    </span>
  )
}

/** סימון "יש הערות" ליד שם השורה. הטקסט המלא ב-title, לא בטבלה עצמה. */
export function NotesIcon({ notes }: { notes: string | null }) {
  if (!notes?.trim()) return null

  const preview = notes.trim()
  return (
    <span
      title={preview.length > 200 ? `${preview.slice(0, 200)}…` : preview}
      className="text-gray-400 cursor-help"
      aria-label="יש הערות"
    >
      📝
    </span>
  )
}
