import { createServerClient } from '@/lib/supabase/server'
import { calcMonthlyRevenue } from './revenue'
import { getWeekStart, toDateStr } from './utilization'
import type { MonthRevenue, RevenueInput } from './revenue'

/**
 * גבולות החודש הקלנדרי של `today`.
 *
 * זיהוי החודש נעשה ב-local time — במכוון, כדי להסכים עם `getHeroMonth`
 * ב-cockpit-helpers.ts. אחרת המסך היה עלול להציג ניצול לאוגוסט והכנסה ליולי.
 * התאריכים עצמם נבנים ב-UTC, כי כל מנוע התאריכים בפרויקט עובד ב-UTC.
 */
export function getMonthBounds(today: Date = new Date()): { monthStart: Date; monthEnd: Date } {
  const year = today.getFullYear()
  const month = today.getMonth() // 0-indexed
  return {
    monthStart: new Date(Date.UTC(year, month, 1)),
    monthEnd: new Date(Date.UTC(year, month + 1, 0)), // יום 0 של החודש הבא = היום האחרון בחודש
  }
}

/**
 * שליפה עצמאית לחלוטין לחישוב ההכנסה. לא נוגעת ב-`fetchUtilization`
 * ולא בחלון הזמן שלו — שני המספרים מסתכלים על טווחים שונים במכוון.
 *
 * לא נשלפים `capacity_exceptions` ולא `users`: להכנסה אין מכנה קיבולת,
 * ו-`plan` כבר חוזר מ-`fetchUtilization` בקוקפיט.
 */
export async function fetchMonthlyRevenue(
  userId: string,
  today: Date = new Date(),
): Promise<MonthRevenue> {
  const supabase = await createServerClient()
  const { monthStart, monthEnd } = getMonthBounds(today)
  const startStr = toDateStr(monthStart)
  const endStr = toDateStr(monthEnd)

  const [{ data: projects }, { data: retainers }, { data: deals }] = await Promise.all([
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
  ])

  // השבוע הראשון בטווח עשוי להתחיל בחודש הקודם — allocations נשלפות
  // מיום שני של השבוע שמכיל את ה-1 בחודש.
  const activeProjectIds = (projects ?? []).map((p: { id: string }) => p.id)
  const { data: allocations } =
    activeProjectIds.length > 0
      ? await supabase
          .from('project_weekly_allocations')
          .select('*')
          .in('project_id', activeProjectIds)
          .gte('week_start', toDateStr(getWeekStart(monthStart)))
          .lte('week_start', endStr)
      : { data: [] }

  const input: RevenueInput = {
    monthStart,
    monthEnd,
    projects: projects ?? [],
    allocations: allocations ?? [],
    retainers: retainers ?? [],
    deals: deals ?? [],
  }

  const result = calcMonthlyRevenue(input)

  // ═══ TEMP DEBUG — להסרה אחרי אבחון אי-ההתאמה ═══
  console.log('\n═══ REVENUE DEBUG ═══')
  console.log(`month: ${startStr} .. ${endStr}`)
  console.log(
    `rows: projects=${input.projects.length} retainers=${input.retainers.length} deals=${input.deals.length} allocations=${input.allocations.length}`,
  )
  for (const p of input.projects) {
    console.log(
      `  PROJECT "${p.name}" ${p.pricing_type} ${p.start_date}..${p.end_date} est=${p.estimated_hours} rate=${p.hourly_rate} fixed=${p.fixed_price}`,
    )
  }
  for (const r of input.retainers) {
    console.log(
      `  RETAINER "${r.name}" ${r.pricing_type} ${r.start_date}..${r.end_date ?? 'open'} mh=${r.monthly_hours} rate=${r.hourly_rate} monthlyFixed=${r.monthly_fixed_price}`,
    )
  }
  for (const d of input.deals) {
    console.log(
      `  DEAL "${d.name}" ${d.deal_type}/${d.pricing_type} stage=${d.current_stage} override=${d.probability_override} ${d.expected_start_date}..${d.expected_end_date ?? 'open'} est=${d.estimated_hours} mh=${d.monthly_hours} rate=${d.hourly_rate} fixed=${d.fixed_price}`,
    )
  }
  for (const a of input.allocations) {
    console.log(`  ALLOC project=${a.project_id} week=${a.week_start} hours=${a.allocated_hours}`)
  }
  console.log('  week        frac    project   pipeline      total   (שבועי בלבד)')
  for (const w of result.weeks) {
    console.log(
      `  ${w.weekStart}  ${w.monthFraction.toFixed(3)}  ${w.projectRevenue.toFixed(2).padStart(9)}  ${w.pipelineRevenue.toFixed(2).padStart(9)}  ${w.total.toFixed(2).padStart(9)}`,
    )
  }
  console.log(
    `  TOTALS: projects=${result.projectRevenue.toFixed(2)} retainers=${result.retainerRevenue.toFixed(2)} pipeline=${result.pipelineRevenue.toFixed(2)}`,
  )
  console.log(`  GRAND TOTAL: ${result.total.toFixed(2)}`)
  console.log('═══ END REVENUE DEBUG ═══\n')

  return result
}
