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

  return calcMonthlyRevenue(input)
}
