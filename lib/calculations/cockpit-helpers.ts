import type { WeekBreakdown } from '@/lib/calculations/types'
import { UTILIZATION_LOW_THRESHOLD, UTILIZATION_HIGH_THRESHOLD, UTILIZATION_OVERLOAD_THRESHOLD } from './thresholds'

export type MonthSummary = {
  yearMonth: string    // "2026-07"
  monthLabel: string   // "יולי 2026"
  monthIndex: number   // 1-based
  utilization: number  // capacity-weighted utilization: Σ(committed+pipeline) / Σcapacity (capacity is workday-prorated for boundary weeks, see workdaysInMonth)
  weeks: WeekBreakdown[]
}

export type HeroMonth = {
  monthIndex: number
  monthLabel: string
  utilization: number
  nextMonthOverload?: {
    monthIndex: number
    monthLabel: string
    utilization: number
  }
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return `${HEBREW_MONTHS[month - 1]} ${year}`
}

/** ראשון, שני, שלישי, רביעי, חמישי — 5 ימי העבודה, כאופסט ביחס למפתח יום שני. */
const WORK_WEEK_OFFSETS = [-1, 0, 1, 2, 3]

/**
 * מספר ימי העבודה (מתוך 5, ראשון–חמישי) של השבוע שנופלים בחודש קלנדרי נתון.
 * "יום שני" הוא רק מפתח האיסוף הפנימי של מנוע הניצול (ראה Utilization-Engine) —
 * כאן ממפים אותו לחמשת ימי העבודה בפועל כדי לפרוס קיבולת נכון על פני גבול חודש.
 * שבוע שכולו בתוך חודש אחד מחזיר 5; שבוע גבול מחזיר את החלק הרלוונטי.
 */
function workdaysInMonth(weekStart: string, yearMonth: string): number {
  const [year, month, day] = weekStart.split('-').map(Number)
  const monday = new Date(Date.UTC(year, month - 1, day))
  let count = 0
  for (const offset of WORK_WEEK_OFFSETS) {
    const d = new Date(monday)
    d.setUTCDate(d.getUTCDate() + offset)
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (ym === yearMonth) count++
  }
  return count
}

export function groupWeeksByMonth(weeks: WeekBreakdown[]): MonthSummary[] {
  const groups = new Map<string, WeekBreakdown[]>()
  for (const week of weeks) {
    const key = week.weekStart.slice(0, 7) // YYYY-MM
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(week)
  }
  return Array.from(groups.entries()).map(([yearMonth, monthWeeks], i) => {
    // הקיבולת נפרסת לפי ימי עבודה בפועל (ראשון–חמישי) שנופלים בחודש — לא
    // לפי איזה חודש "מכיל" את מפתח יום השני. שבוע גבול תורם קיבולת חלקית
    // לשני החודשים שהוא חוצה, ולכן סורקים את כל weeks (לא רק monthWeeks).
    // totalHours נשאר ללא שינוי במכוון — מיוחס במלואו לחודש שמכיל את מפתח השבוע.
    const totalCapacity = weeks.reduce((sum, w) => {
      const days = workdaysInMonth(w.weekStart, yearMonth)
      return days > 0 ? sum + w.capacity * (days / 5) : sum
    }, 0)
    const totalHours = monthWeeks.reduce((sum, w) => sum + w.committedHours + w.pipelineHours, 0)
    return {
      yearMonth,
      monthLabel: formatMonthLabel(yearMonth),
      monthIndex: i + 1,
      utilization: totalCapacity > 0 ? totalHours / totalCapacity : 0,
      weeks: monthWeeks,
    }
  })
}

export function getHeroMonth(weeks: WeekBreakdown[], today: Date = new Date()): HeroMonth {
  const months = groupWeeksByMonth(weeks)

  const year = today.getFullYear()
  const month = today.getMonth() // 0-indexed
  const currentYearMonth = `${year}-${String(month + 1).padStart(2, '0')}`
  // Use local Date constructor to avoid UTC/local mismatch when crossing year boundaries
  const nextMonthLocal = new Date(year, month + 1, 1)
  const nextYearMonth = `${nextMonthLocal.getFullYear()}-${String(nextMonthLocal.getMonth() + 1).padStart(2, '0')}`

  const currentMonth = months.find(m => m.yearMonth === currentYearMonth)
  const nextMonth = months.find(m => m.yearMonth === nextYearMonth)

  const result: HeroMonth = {
    monthIndex: currentMonth?.monthIndex ?? 0,
    monthLabel: currentMonth?.monthLabel ?? formatMonthLabel(currentYearMonth),
    utilization: currentMonth?.utilization ?? 0,
  }

  if (nextMonth && nextMonth.utilization > UTILIZATION_OVERLOAD_THRESHOLD) {
    result.nextMonthOverload = {
      monthIndex: nextMonth.monthIndex,
      monthLabel: nextMonth.monthLabel,
      utilization: nextMonth.utilization,
    }
  }

  return result
}

export function getStartOfCurrentWeek(today: Date = new Date()): Date {
  const d = new Date(today)
  const day = d.getUTCDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day // distance back to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d
}

export function utilizationColorClass(utilization: number): string {
  if (utilization > UTILIZATION_OVERLOAD_THRESHOLD) return 'text-red-900'
  if (utilization >= UTILIZATION_HIGH_THRESHOLD) return 'text-green-600'
  if (utilization >= UTILIZATION_LOW_THRESHOLD) return 'text-yellow-600'
  return 'text-red-600'
}

export function utilizationBarColorClass(utilization: number): string {
  if (utilization > UTILIZATION_OVERLOAD_THRESHOLD) return 'bg-red-900'
  if (utilization >= UTILIZATION_HIGH_THRESHOLD) return 'bg-green-500'
  if (utilization >= UTILIZATION_LOW_THRESHOLD) return 'bg-yellow-400'
  return 'bg-red-400'
}
