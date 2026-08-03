import { PIPELINE_STAGES } from '@/lib/pipeline-stages'
import type { Project, Retainer, PipelineDeal, ProjectWeeklyAllocation } from '@/lib/types'
import { parseDate, toDateStr, getWeeksInRange } from './utilization'
import { formatMonthLabel } from './cockpit-helpers'

/**
 * תחזית הכנסה לחודש קלנדרי — לוגיקה טהורה, ללא DB וללא side-effects.
 *
 * מבודד ממנוע הניצול בכוונה: הזרימה חד-כיוונית (ניצול ← הכנסה). הקובץ הזה
 * מייבא מ-utilization.ts עוזרי תאריכים טהורים בלבד ואינו משנה בו דבר, ואינו
 * נוגע ב-capacity — להכנסה אין מכנה קיבולת. גם חלון הזמן שונה במכוון: כאן
 * חודש קלנדרי מלא, מול חלון ה-3 חודשים קדימה של המנוע.
 */

/** מקביל ל-4.33 שמנוע הניצול משתמש בו לפריסת ישויות חודשיות לשבועות. */
const WEEKS_PER_MONTH = 4.33

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY

export type RevenueInput = {
  monthStart: Date   // ה-1 בחודש, UTC
  monthEnd: Date     // היום האחרון בחודש, UTC
  projects: Project[]
  allocations: ProjectWeeklyAllocation[]
  retainers: Retainer[]
  deals: PipelineDeal[]
}

export type WeekRevenue = {
  weekStart: string        // ISO date YYYY-MM-DD, תמיד יום שני
  monthFraction: number    // 0..1 — חלק השבוע שנופל בתוך החודש הקלנדרי
  projectRevenue: number   // תרומה שבועית מלאה, לפני monthFraction
  retainerRevenue: number
  pipelineRevenue: number  // כבר משוקללת בהסתברות השלב
  total: number            // (project + retainer + pipeline) × monthFraction
}

export type MonthRevenue = {
  yearMonth: string        // "2026-08"
  monthLabel: string       // "אוגוסט 2026"
  total: number
  weeks: WeekRevenue[]
}

/**
 * אורך ישות בשבועות, לפי אותה נוסחה שמנוע הניצול משתמש בה.
 * מחזיר 0 כשהטווח מנוון — `chk_end_after_start` מתיר end === start,
 * ואסור שזה ייהפך לחלוקה באפס.
 */
function entityWeeks(startDate: string, endDate: string): number {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const weeks = (end.getTime() - start.getTime()) / MS_PER_WEEK
  return weeks > 0 ? weeks : 0
}

/** חלק השבוע (0..1) שנופל בתוך החודש הקלנדרי — לשבועות שחוצים גבול חודש. */
function monthFractionForWeek(weekStart: Date, monthStart: Date, monthEnd: Date): number {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  const overlapStart = Math.max(weekStart.getTime(), monthStart.getTime())
  const overlapEnd = Math.min(weekEnd.getTime(), monthEnd.getTime())
  if (overlapEnd < overlapStart) return 0

  const days = (overlapEnd - overlapStart) / MS_PER_DAY + 1
  return days / 7
}

function projectRevenueForWeek(
  weekStart: Date,
  projects: Project[],
  allocations: ProjectWeeklyAllocation[],
): number {
  const weekStartStr = toDateStr(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  let revenue = 0

  for (const p of projects) {
    if (p.status !== 'active') continue
    const pStart = parseDate(p.start_date)
    const pEnd = parseDate(p.end_date)
    if (pStart.getTime() > weekEnd.getTime()) continue
    if (pEnd.getTime() < weekStart.getTime()) continue

    const projectWeeks = entityWeeks(p.start_date, p.end_date)
    if (projectWeeks === 0) continue

    if (p.pricing_type === 'fixed') {
      // פריסה שווה: המכנה הוא אורך הפרויקט המלא, לא החלק שבתוך החודש
      revenue += (p.fixed_price ?? 0) / projectWeeks
    } else {
      const alloc = allocations.find(a => a.project_id === p.id && a.week_start === weekStartStr)
      const hours = alloc ? alloc.allocated_hours : p.estimated_hours / projectWeeks
      revenue += hours * (p.hourly_rate ?? 0)
    }
  }

  return revenue
}

function retainerRevenueForWeek(weekStart: Date, retainers: Retainer[]): number {
  let revenue = 0

  for (const r of retainers) {
    if (r.status !== 'active') continue
    const rStart = parseDate(r.start_date)
    const rEnd = r.end_date ? parseDate(r.end_date) : null
    if (weekStart.getTime() < rStart.getTime()) continue
    if (rEnd && weekStart.getTime() > rEnd.getTime()) continue

    if (r.pricing_type === 'fixed_monthly') {
      // monthly_fixed_price הוא כבר סכום חודשי — נפרס לשבועות, לא לאורך הריטיינר
      revenue += (r.monthly_fixed_price ?? 0) / WEEKS_PER_MONTH
    } else {
      revenue += (r.monthly_hours / WEEKS_PER_MONTH) * (r.hourly_rate ?? 0)
    }
  }

  return revenue
}

function pipelineRevenueForWeek(weekStart: Date, deals: PipelineDeal[]): number {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  let revenue = 0

  for (const d of deals) {
    if (d.status !== 'active') continue
    const dStart = parseDate(d.expected_start_date)
    if (dStart.getTime() > weekEnd.getTime()) continue

    const probability = d.probability_override ?? PIPELINE_STAGES[d.current_stage].probability

    if (d.deal_type === 'retainer') {
      // אין end_date → תורם עד סוף הטווח, מראה אחיד עם מנוע הניצול
      const dEnd = d.expected_end_date ? parseDate(d.expected_end_date) : null
      if (dEnd && dEnd.getTime() < weekStart.getTime()) continue

      // הנחה A1: ב-deal_type='retainer', fixed_price הוא סכום חודשי —
      // במקביל ל-monthly_hours שהמנוע כבר מחלק ב-4.33 לאותה שורת עסקה
      const weekly =
        d.pricing_type === 'fixed'
          ? (d.fixed_price ?? 0) / WEEKS_PER_MONTH
          : ((d.monthly_hours ?? 0) / WEEKS_PER_MONTH) * (d.hourly_rate ?? 0)
      revenue += weekly * probability
    } else {
      const dEnd = parseDate(d.expected_end_date!)
      if (dEnd.getTime() < weekStart.getTime()) continue

      const dealWeeks = entityWeeks(d.expected_start_date, d.expected_end_date!)
      if (dealWeeks === 0) continue

      const weekly =
        d.pricing_type === 'fixed'
          ? (d.fixed_price ?? 0) / dealWeeks
          : ((d.estimated_hours ?? 0) / dealWeeks) * (d.hourly_rate ?? 0)
      revenue += weekly * probability
    }
  }

  return revenue
}

export function calcMonthlyRevenue(input: RevenueInput): MonthRevenue {
  const weeks = getWeeksInRange(input.monthStart, input.monthEnd).map<WeekRevenue>(weekStart => {
    const monthFraction = monthFractionForWeek(weekStart, input.monthStart, input.monthEnd)
    const projectRevenue = projectRevenueForWeek(weekStart, input.projects, input.allocations)
    const retainerRevenue = retainerRevenueForWeek(weekStart, input.retainers)
    const pipelineRevenue = pipelineRevenueForWeek(weekStart, input.deals)

    return {
      weekStart: toDateStr(weekStart),
      monthFraction,
      projectRevenue,
      retainerRevenue,
      pipelineRevenue,
      total: (projectRevenue + retainerRevenue + pipelineRevenue) * monthFraction,
    }
  })

  const yearMonth = toDateStr(input.monthStart).slice(0, 7)

  return {
    yearMonth,
    monthLabel: formatMonthLabel(yearMonth),
    total: weeks.reduce((sum, w) => sum + w.total, 0),
    weeks,
  }
}
