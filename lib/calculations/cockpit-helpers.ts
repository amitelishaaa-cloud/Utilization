import type { WeekBreakdown, RecommendationResult } from '@/lib/calculations/types'

export type MonthSummary = {
  yearMonth: string    // "2026-07"
  monthLabel: string   // "יולי 2026"
  monthIndex: number   // 1-based
  utilization: number  // average weekly utilization for the month
  weeks: WeekBreakdown[]
}

export type HeroMonth = {
  monthIndex: number
  monthLabel: string
  utilization: number
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return `${HEBREW_MONTHS[month - 1]} ${year}`
}

export function groupWeeksByMonth(weeks: WeekBreakdown[]): MonthSummary[] {
  const groups = new Map<string, WeekBreakdown[]>()
  for (const week of weeks) {
    const key = week.weekStart.slice(0, 7) // YYYY-MM
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(week)
  }
  return Array.from(groups.entries()).map(([yearMonth, monthWeeks], i) => ({
    yearMonth,
    monthLabel: formatMonthLabel(yearMonth),
    monthIndex: i + 1,
    utilization:
      monthWeeks.reduce((sum, w) => sum + w.utilization, 0) / monthWeeks.length,
    weeks: monthWeeks,
  }))
}

export function getHeroMonth(
  weeks: WeekBreakdown[],
  recommendation: RecommendationResult,
): HeroMonth {
  const months = groupWeeksByMonth(weeks)
  if (
    recommendation.affectedMonthIndex !== null &&
    recommendation.affectedMonthUtilization !== null
  ) {
    const month = months[recommendation.affectedMonthIndex - 1]
    return {
      monthIndex: recommendation.affectedMonthIndex,
      utilization: recommendation.affectedMonthUtilization,
      monthLabel: month?.monthLabel ?? `חודש ${recommendation.affectedMonthIndex}`,
    }
  }
  // fallback: optimal / sustained_high → show month 1
  const first = months[0]
  return {
    monthIndex: 1,
    monthLabel: first?.monthLabel ?? 'חודש 1',
    utilization: first?.utilization ?? 0,
  }
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
  if (utilization > 1.1) return 'text-red-900'
  if (utilization >= 0.8) return 'text-green-600'
  if (utilization >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}

export function utilizationBarColorClass(utilization: number): string {
  if (utilization > 1.1) return 'bg-red-900'
  if (utilization >= 0.8) return 'bg-green-500'
  if (utilization >= 0.5) return 'bg-yellow-400'
  return 'bg-red-400'
}
