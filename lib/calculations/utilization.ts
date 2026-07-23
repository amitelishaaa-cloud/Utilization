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
      const projectWeeks = (pEnd.getTime() - pStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
      hours += p.estimated_hours / projectWeeks
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
    const dEnd = parseDate(d.expected_end_date)
    if (dStart.getTime() > weekEnd.getTime()) continue
    if (dEnd.getTime() < weekStart.getTime()) continue

    const probability = d.probability_override ?? PIPELINE_STAGES[d.current_stage].probability
    const dealWeeks = (dEnd.getTime() - dStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    hours += (d.estimated_hours / dealWeeks) * probability
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
