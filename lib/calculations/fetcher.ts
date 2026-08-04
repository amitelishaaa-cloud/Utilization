import { createServerClient } from '@/lib/supabase/server'
import { calcWeeklyUtilization, toDateStr } from './utilization'
import { calcRecommendation } from './recommendations'
import type { WeekBreakdown, UtilizationInput, RecommendationResult } from './types'

export type UtilizationFetchResult = {
  weeks: WeekBreakdown[]
  recommendation: RecommendationResult
  plan: 'free' | 'pro'
}

export async function fetchUtilization(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<UtilizationFetchResult> {
  const supabase = await createServerClient()
  const startStr = toDateStr(startDate)
  const endStr = toDateStr(endDate)

  const [
    { data: user },
    { data: projects },
    { data: retainers },
    { data: deals },
    { data: capacityExceptions },
  ] = await Promise.all([
    supabase.from('users').select('default_weekly_hours, works_friday, plan').eq('id', userId).single(),
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('start_date', endStr)
      .gte('end_date', startStr),
    supabase
      .from('retainers')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('start_date', endStr)
      .or(`end_date.is.null,end_date.gte.${startStr}`),
    supabase
      .from('pipeline_deals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('expected_start_date', endStr)
      .or(`expected_end_date.is.null,expected_end_date.gte.${startStr}`),
    supabase
      .from('capacity_exceptions')
      .select('*')
      .eq('user_id', userId)
      .gte('week_start', startStr)
      .lte('week_start', endStr),
  ])

  const activeProjectIds = (projects ?? []).map((p: { id: string }) => p.id)
  const { data: allocations } =
    activeProjectIds.length > 0
      ? await supabase
          .from('project_weekly_allocations')
          .select('*')
          .in('project_id', activeProjectIds)
          .gte('week_start', startStr)
          .lte('week_start', endStr)
      : { data: [] }

  const input: UtilizationInput = {
    defaultWeeklyHours: user?.default_weekly_hours ?? 40,
    worksFriday: user?.works_friday ?? false,
    startDate,
    endDate,
    projects: projects ?? [],
    allocations: allocations ?? [],
    retainers: retainers ?? [],
    deals: deals ?? [],
    capacityExceptions: capacityExceptions ?? [],
  }

  const weeks = calcWeeklyUtilization(input)
  return { weeks, recommendation: calcRecommendation(weeks), plan: (user?.plan ?? 'free') as 'free' | 'pro' }
}
