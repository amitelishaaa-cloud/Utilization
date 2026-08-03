import type { Priority } from '@/lib/types'

/**
 * דירוג עדיפות, 5 = הגבוה ביותר.
 * Tailwind classes הם strings סטטיים — lookup בלבד, לא בניית class דינמית.
 */
export const PRIORITIES: Record<Priority, { label: string; badge: string }> = {
  5: { label: 'קריטי',      badge: 'bg-red-100 text-red-700' },
  4: { label: 'גבוה',       badge: 'bg-orange-100 text-orange-700' },
  3: { label: 'רגיל',       badge: 'bg-gray-100 text-gray-600' },
  2: { label: 'נמוך',       badge: 'bg-gray-100 text-gray-500' },
  1: { label: 'נמוך מאוד',  badge: 'bg-gray-100 text-gray-400' },
}

/** סדר התצוגה בטופס — מהגבוה לנמוך */
export const PRIORITY_OPTIONS: Priority[] = [5, 4, 3, 2, 1]

/**
 * ממיר ערך גולמי מ-FormData ל-Priority תקין, או null.
 * ערך מחוץ ל-1..5 מנורמל ל-null כדי שה-CHECK ב-DB לא ייחשף כשגיאת Postgres.
 */
export function parsePriority(raw: FormDataEntryValue | null): Priority | null {
  const value = ((raw as string) ?? '').trim()
  if (!value) return null
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 5 ? (n as Priority) : null
}
