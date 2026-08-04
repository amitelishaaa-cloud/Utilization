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

/** פירוק שבועי — רק למקורות שנפרסים על ציר הזמן (פרויקטים ועסקאות פרויקט). */
export type WeekRevenue = {
  weekStart: string        // ISO date YYYY-MM-DD, תמיד יום שני
  monthFraction: number    // 0..1 — חלק השבוע שנופל בתוך החודש הקלנדרי
  projectRevenue: number   // תרומה שבועית מלאה, לפני monthFraction
  pipelineRevenue: number  // עסקאות פרויקט, כבר משוקללות בהסתברות
  total: number            // (project + pipeline) × monthFraction
}

export type MonthRevenue = {
  yearMonth: string          // "2026-08"
  monthLabel: string         // "אוגוסט 2026"
  projectRevenue: number     // פרויקטים — נפרסים שבועית
  retainerRevenue: number    // רטיינרים — הסכום החודשי המלא
  pipelineRevenue: number    // עסקאות — פרויקט נפרס שבועית, ריטיינר חודשי; שניהם משוקללים
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

/** האם הישות פעילה בנקודה כלשהי בתוך החודש הקלנדרי. */
function activeInMonth(
  startDate: string,
  endDate: string | null,
  monthStart: Date,
  monthEnd: Date,
): boolean {
  if (parseDate(startDate).getTime() > monthEnd.getTime()) return false
  if (endDate && parseDate(endDate).getTime() < monthStart.getTime()) return false
  return true
}

/**
 * רטיינר הוא ישות חודשית: הוא מחויב פעם בחודש בסכום ידוע, ולכן תורם את
 * הסכום החודשי המלא לכל חודש שבו הוא פעיל. אין פריסה לשבועות ואין קבוע 4.33 —
 * אורך החודש לא משנה את הסכום.
 */
function retainerRevenueForMonth(
  retainers: Retainer[],
  monthStart: Date,
  monthEnd: Date,
): number {
  let revenue = 0

  for (const r of retainers) {
    if (r.status !== 'active') continue
    if (!activeInMonth(r.start_date, r.end_date, monthStart, monthEnd)) continue

    revenue +=
      r.pricing_type === 'fixed_monthly'
        ? (r.monthly_fixed_price ?? 0)
        : r.monthly_hours * (r.hourly_rate ?? 0)
  }

  return revenue
}

/** עסקאות ריטיינר — אותה סמנטיקה חודשית, משוקללת בהסתברות השלב. */
function pipelineRetainerRevenueForMonth(
  deals: PipelineDeal[],
  monthStart: Date,
  monthEnd: Date,
): number {
  let revenue = 0

  for (const d of deals) {
    if (d.status !== 'active') continue
    if (d.deal_type !== 'retainer') continue
    if (!activeInMonth(d.expected_start_date, d.expected_end_date, monthStart, monthEnd)) continue

    const probability = d.probability_override ?? PIPELINE_STAGES[d.current_stage].probability

    // הנחה A1: ב-deal_type='retainer', fixed_price הוא הסכום החודשי
    const monthly =
      d.pricing_type === 'fixed'
        ? (d.fixed_price ?? 0)
        : (d.monthly_hours ?? 0) * (d.hourly_rate ?? 0)

    revenue += monthly * probability
  }

  return revenue
}

/** עסקאות מסוג פרויקט בלבד — עסקאות ריטיינר מטופלות ברמה החודשית. */
function pipelineProjectRevenueForWeek(weekStart: Date, deals: PipelineDeal[]): number {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  let revenue = 0

  for (const d of deals) {
    if (d.status !== 'active') continue
    if (d.deal_type === 'retainer') continue

    const dStart = parseDate(d.expected_start_date)
    if (dStart.getTime() > weekEnd.getTime()) continue
    const dEnd = parseDate(d.expected_end_date!)
    if (dEnd.getTime() < weekStart.getTime()) continue

    const dealWeeks = entityWeeks(d.expected_start_date, d.expected_end_date!)
    if (dealWeeks === 0) continue

    const probability = d.probability_override ?? PIPELINE_STAGES[d.current_stage].probability
    const weekly =
      d.pricing_type === 'fixed'
        ? (d.fixed_price ?? 0) / dealWeeks
        : ((d.estimated_hours ?? 0) / dealWeeks) * (d.hourly_rate ?? 0)

    revenue += weekly * probability
  }

  return revenue
}

export function calcMonthlyRevenue(input: RevenueInput): MonthRevenue {
  // מקורות שנפרסים על ציר הזמן — פרויקטים ועסקאות פרויקט
  const weeks = getWeeksInRange(input.monthStart, input.monthEnd).map<WeekRevenue>(weekStart => {
    const monthFraction = monthFractionForWeek(weekStart, input.monthStart, input.monthEnd)
    const projectRevenue = projectRevenueForWeek(weekStart, input.projects, input.allocations)
    const pipelineRevenue = pipelineProjectRevenueForWeek(weekStart, input.deals)

    return {
      weekStart: toDateStr(weekStart),
      monthFraction,
      projectRevenue,
      pipelineRevenue,
      total: (projectRevenue + pipelineRevenue) * monthFraction,
    }
  })

  // מקורות חודשיים — רטיינרים ועסקאות ריטיינר
  const retainerRevenue = retainerRevenueForMonth(input.retainers, input.monthStart, input.monthEnd)
  const pipelineRetainerRevenue = pipelineRetainerRevenueForMonth(
    input.deals,
    input.monthStart,
    input.monthEnd,
  )

  const projectRevenue = weeks.reduce((sum, w) => sum + w.projectRevenue * w.monthFraction, 0)
  const pipelineRevenue =
    weeks.reduce((sum, w) => sum + w.pipelineRevenue * w.monthFraction, 0) + pipelineRetainerRevenue

  const yearMonth = toDateStr(input.monthStart).slice(0, 7)

  return {
    yearMonth,
    monthLabel: formatMonthLabel(yearMonth),
    projectRevenue,
    retainerRevenue,
    pipelineRevenue,
    total: projectRevenue + retainerRevenue + pipelineRevenue,
    weeks,
  }
}
