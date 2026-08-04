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
  projectRevenue: number   // תרומת הפרויקטים לימי השבוע שבתוך החודש
  pipelineRevenue: number  // עסקאות פרויקט, כבר משוקללות בהסתברות
  total: number            // project + pipeline
}

export type MonthRevenue = {
  yearMonth: string          // "2026-08"
  monthLabel: string         // "אוגוסט 2026"
  projectRevenue: number     // פרויקטים — נפרסים לפי ימים
  retainerRevenue: number    // רטיינרים — הסכום החודשי המלא
  pipelineRevenue: number    // עסקאות — פרויקט לפי ימים, ריטיינר חודשי; שניהם משוקללים
  total: number
  weeks: WeekRevenue[]
}

/** מספר ימים בטווח, כולל שני הקצוות. טווח של יום בודד = 1. */
function daysInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1
}

/** ימי החפיפה בין שני טווחים, כולל קצוות. 0 כשאין חפיפה. */
function overlapDays(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const start = Math.max(aStart.getTime(), bStart.getTime())
  const end = Math.min(aEnd.getTime(), bEnd.getTime())
  if (end < start) return 0
  return Math.round((end - start) / MS_PER_DAY) + 1
}

/**
 * ערך כספי כולל של ישות עם טווח תאריכים (פרויקט או עסקת פרויקט).
 * fixed → המחיר הכולל; hourly → שעות × תעריף.
 */
function totalValue(
  pricingType: 'hourly' | 'fixed',
  fixedPrice: number | null,
  hours: number | null,
  hourlyRate: number | null,
): number {
  return pricingType === 'fixed' ? (fixedPrice ?? 0) : (hours ?? 0) * (hourlyRate ?? 0)
}

/**
 * תרומת הפרויקטים לימי השבוע שנופלים בתוך החודש.
 *
 * הפריסה היא **לפי ימים**: `ערך_כולל × (ימי חפיפה / סך ימי הפרויקט)`. פריסה
 * לפי תעריף שבועי שגויה כאן — פרויקט שאורכו אינו כפולה שלמה של שבוע חופף
 * ליותר שבועות קלנדריים מ-`(end − start)/7`, וכל שבוע מלא היה מקבל תעריף
 * שבועי שלם, כך שסכום התרומות חורג מערך הפרויקט.
 */
function projectRevenueForWeek(
  weekStart: Date,
  monthStart: Date,
  monthEnd: Date,
  projects: Project[],
  allocations: ProjectWeeklyAllocation[],
): number {
  const weekStartStr = toDateStr(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  // חלק השבוע שנמצא בתוך החודש — רק עליו סופרים
  const spanStart = new Date(Math.max(weekStart.getTime(), monthStart.getTime()))
  const spanEnd = new Date(Math.min(weekEnd.getTime(), monthEnd.getTime()))
  if (spanEnd.getTime() < spanStart.getTime()) return 0

  let revenue = 0

  for (const p of projects) {
    if (p.status !== 'active') continue
    const pStart = parseDate(p.start_date)
    const pEnd = parseDate(p.end_date)
    if (pEnd.getTime() < pStart.getTime()) continue

    // שעות ידניות מוגדרות ברמת שבוע — נפרסות פרו-רטה לחלק השבוע שבחודש
    const alloc =
      p.pricing_type === 'hourly'
        ? allocations.find(a => a.project_id === p.id && a.week_start === weekStartStr)
        : undefined

    if (alloc) {
      const weekDaysInMonth = overlapDays(weekStart, weekEnd, monthStart, monthEnd)
      revenue += alloc.allocated_hours * (p.hourly_rate ?? 0) * (weekDaysInMonth / 7)
      continue
    }

    const days = overlapDays(pStart, pEnd, spanStart, spanEnd)
    if (days === 0) continue

    const value = totalValue(p.pricing_type, p.fixed_price, p.estimated_hours, p.hourly_rate)
    revenue += value * (days / daysInclusive(pStart, pEnd))
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
function pipelineProjectRevenueForWeek(
  weekStart: Date,
  monthStart: Date,
  monthEnd: Date,
  deals: PipelineDeal[],
): number {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  const spanStart = new Date(Math.max(weekStart.getTime(), monthStart.getTime()))
  const spanEnd = new Date(Math.min(weekEnd.getTime(), monthEnd.getTime()))
  if (spanEnd.getTime() < spanStart.getTime()) return 0

  let revenue = 0

  for (const d of deals) {
    if (d.status !== 'active') continue
    if (d.deal_type === 'retainer') continue

    const dStart = parseDate(d.expected_start_date)
    const dEnd = parseDate(d.expected_end_date!)
    if (dEnd.getTime() < dStart.getTime()) continue

    const days = overlapDays(dStart, dEnd, spanStart, spanEnd)
    if (days === 0) continue

    const probability = d.probability_override ?? PIPELINE_STAGES[d.current_stage].probability
    const value = totalValue(d.pricing_type, d.fixed_price, d.estimated_hours, d.hourly_rate)

    revenue += value * (days / daysInclusive(dStart, dEnd)) * probability
  }

  return revenue
}

export function calcMonthlyRevenue(input: RevenueInput): MonthRevenue {
  // מקורות שנפרסים על ציר הזמן — פרויקטים ועסקאות פרויקט
  const weeks = getWeeksInRange(input.monthStart, input.monthEnd).map<WeekRevenue>(weekStart => {
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

    const monthFraction =
      overlapDays(weekStart, weekEnd, input.monthStart, input.monthEnd) / 7
    const projectRevenue = projectRevenueForWeek(
      weekStart,
      input.monthStart,
      input.monthEnd,
      input.projects,
      input.allocations,
    )
    const pipelineRevenue = pipelineProjectRevenueForWeek(
      weekStart,
      input.monthStart,
      input.monthEnd,
      input.deals,
    )

    return {
      weekStart: toDateStr(weekStart),
      monthFraction,
      projectRevenue,
      pipelineRevenue,
      total: projectRevenue + pipelineRevenue,
    }
  })

  // מקורות חודשיים — רטיינרים ועסקאות ריטיינר
  const retainerRevenue = retainerRevenueForMonth(input.retainers, input.monthStart, input.monthEnd)
  const pipelineRetainerRevenue = pipelineRetainerRevenueForMonth(
    input.deals,
    input.monthStart,
    input.monthEnd,
  )

  const projectRevenue = weeks.reduce((sum, w) => sum + w.projectRevenue, 0)
  const pipelineRevenue =
    weeks.reduce((sum, w) => sum + w.pipelineRevenue, 0) + pipelineRetainerRevenue

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
