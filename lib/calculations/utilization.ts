import { PIPELINE_STAGES } from '@/lib/pipeline-stages'
import type { Project, Retainer, PipelineDeal, ProjectWeeklyAllocation, CapacityException } from '@/lib/types'
import type { WeekBreakdown, UtilizationInput } from './types'

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dow = d.getUTCDay() // 0=Sun
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

export function getWeeksInRange(startDate: Date, endDate: Date): Date[] {
  const weeks: Date[] = []
  const cur = getWeekStart(startDate)
  const last = getWeekStart(endDate)
  while (cur.getTime() <= last.getTime()) {
    weeks.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 7)
  }
  return weeks
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

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
 * חלוקת שעות לשבוע לפי ימים: `שעות × (ימי חפיפה עם השבוע / סך ימי הישות)`.
 *
 * חלוקה ב-`(end − start)/7` מחשבת פחות שבועות ממספר השבועות הקלנדריים שהישות
 * חופפת להם בכל פעם שאורכה אינו כפולה שלמה של שבוע, וכל שבוע חופף היה מקבל
 * תעריף שבועי מלא — כך שסכום השעות חרג מ-`estimated_hours`.
 */
function hoursForWeekByDays(
  entityStart: Date,
  entityEnd: Date,
  weekStart: Date,
  weekEnd: Date,
  estimatedHours: number,
): number {
  if (entityEnd.getTime() < entityStart.getTime()) return 0
  const days = overlapDays(entityStart, entityEnd, weekStart, weekEnd)
  if (days === 0) return 0
  return estimatedHours * (days / daysInclusive(entityStart, entityEnd))
}

function capacityForWeek(
  weekStart: Date,
  defaultWeeklyHours: number,
  exceptions: CapacityException[],
): number {
  const s = toDateStr(weekStart)
  const ex = exceptions.find(e => e.week_start === s)
  return ex ? ex.available_hours : defaultWeeklyHours
}

function committedHoursForWeek(
  weekStart: Date,
  projects: Project[],
  allocations: ProjectWeeklyAllocation[],
  retainers: Retainer[],
): number {
  const weekStartStr = toDateStr(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  let hours = 0

  for (const p of projects) {
    if (p.status !== 'active') continue
    const pStart = parseDate(p.start_date)
    const pEnd = parseDate(p.end_date)
    if (pStart.getTime() > weekEnd.getTime()) continue
    if (pEnd.getTime() < weekStart.getTime()) continue

    const alloc = allocations.find(a => a.project_id === p.id && a.week_start === weekStartStr)
    if (alloc) {
      hours += alloc.allocated_hours
    } else {
      hours += hoursForWeekByDays(pStart, pEnd, weekStart, weekEnd, p.estimated_hours)
    }
  }

  for (const r of retainers) {
    if (r.status !== 'active') continue
    const rStart = parseDate(r.start_date)
    const rEnd = r.end_date ? parseDate(r.end_date) : null
    if (weekStart.getTime() < rStart.getTime()) continue
    if (rEnd && weekStart.getTime() > rEnd.getTime()) continue
    hours += r.monthly_hours / 4.33
  }

  return hours
}

function pipelineHoursForWeek(weekStart: Date, deals: PipelineDeal[]): number {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  let hours = 0

  for (const d of deals) {
    if (d.status !== 'active') continue
    const dStart = parseDate(d.expected_start_date)
    if (dStart.getTime() > weekEnd.getTime()) continue

    const probability = d.probability_override ?? PIPELINE_STAGES[d.current_stage].probability

    if (d.deal_type === 'retainer') {
      // מראה אחיד עם committedHoursForWeek לריטיינרים אמיתיים:
      // אין end_date → תורם עד סוף חלון החישוב
      const dEnd = d.expected_end_date ? parseDate(d.expected_end_date) : null
      if (dEnd && dEnd.getTime() < weekStart.getTime()) continue
      hours += (d.monthly_hours! / 4.33) * probability
    } else {
      // project — חלוקה לפי ימים, כמו בפרויקטים מחויבים
      const dEnd = parseDate(d.expected_end_date!)
      if (dEnd.getTime() < weekStart.getTime()) continue
      hours += hoursForWeekByDays(dStart, dEnd, weekStart, weekEnd, d.estimated_hours!) * probability
    }
  }

  return hours
}

export function calcWeeklyUtilization(input: UtilizationInput): WeekBreakdown[] {
  return getWeeksInRange(input.startDate, input.endDate).map(weekStart => {
    const capacity = capacityForWeek(weekStart, input.defaultWeeklyHours, input.capacityExceptions)
    const committedHours = committedHoursForWeek(weekStart, input.projects, input.allocations, input.retainers)
    const pipelineHours = pipelineHoursForWeek(weekStart, input.deals)
    const utilization = capacity > 0 ? (committedHours + pipelineHours) / capacity : 0
    return { weekStart: toDateStr(weekStart), committedHours, pipelineHours, capacity, utilization }
  })
}
