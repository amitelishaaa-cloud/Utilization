import { parseDate } from './utilization'
import type { WeekBreakdown, RecommendationTag, RecommendationResult } from './types'

type MonthBucket = { committed: number; pipeline: number; capacity: number }

function groupByMonth(weeks: WeekBreakdown[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>()
  for (const w of weeks) {
    const d = parseDate(w.weekStart)
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    const prev = map.get(key) ?? { committed: 0, pipeline: 0, capacity: 0 }
    map.set(key, {
      committed: prev.committed + w.committedHours,
      pipeline: prev.pipeline + w.pipelineHours,
      capacity: prev.capacity + w.capacity,
    })
  }
  return Array.from(map.values())
}

function pct(u: number): string {
  return `${Math.round(u * 100)}%`
}

function makeResult(
  tag: RecommendationTag,
  color: RecommendationResult['color'],
  text: string,
  monthIndex: number | null,
  utilization: number | null,
): RecommendationResult {
  return { tag, color, text, affectedMonthIndex: monthIndex, affectedMonthUtilization: utilization }
}

export function calcRecommendation(weeks: WeekBreakdown[]): RecommendationResult {
  if (weeks.length === 0) {
    return makeResult('optimal', 'green', 'ניצול צפוי של 0% — אין נתונים לתקופה זו', null, null)
  }

  const months = groupByMonth(weeks).map(({ committed, pipeline, capacity }) => ({
    utilization: capacity > 0 ? (committed + pipeline) / capacity : 0,
  }))

  // Pass 1: overload anywhere always takes priority — return earliest overloaded month
  for (let i = 0; i < months.length; i++) {
    const u = months[i].utilization
    if (u > 1.10) {
      const idx = i + 1
      return makeResult('overload', 'red',
        `ניצול צפוי של ${pct(u)} בחודש ${idx} — הפרויקטים והעסקאות הקיימים עשויים לחרוג מהקיבולת`,
        idx, u)
    }
  }

  // Pass 2: no overload — scan chronologically for gaps and warnings
  for (let i = 0; i < months.length; i++) {
    const u = months[i].utilization
    const idx = i + 1
    if (u < 0.50) {
      if (i === 0) return makeResult('urgent_gap', 'dark_red',
        `ניצול צפוי של ${pct(u)} בחודש הקרוב — אין מספיק עבודה מאושרת או pipeline שמכסה את הקיבולת`,
        1, u)
      if (i === 1) return makeResult('mid_gap', 'orange',
        `ניצול צפוי של ${pct(u)} בחודש השני — ה-pipeline הנוכחי אינו מכסה את הקיבולת לאותה תקופה`,
        2, u)
      return makeResult('far_gap', 'yellow',
        `ניצול צפוי של ${pct(u)} בחודש ${idx} — ה-pipeline הנוכחי אינו מכסה את הקיבולת לאותה תקופה`,
        idx, u)
    }
    if (u < 0.80) {
      return makeResult('warning', 'yellow',
        `ניצול צפוי של ${pct(u)} בחודש ${idx} — הפרויקטים הקיימים אינם מכסים את הקיבולת המלאה`,
        idx, u)
    }
    // 0.80–1.10: optimal range, keep scanning
  }

  const highCount = months.filter(m => m.utilization > 0.90).length
  if (highCount >= 2) {
    return makeResult('sustained_high', 'blue',
      'ניצול גבוה מתמשך — הפרויקטים הקיימים ממלאים את הקיבולת לאורך מספר חודשים',
      null, null)
  }
  const avgU = months.reduce((sum, m) => sum + m.utilization, 0) / months.length
  return makeResult('optimal', 'green',
    `ניצול צפוי של ${pct(avgU)} — הקיבולת מנוצלת היטב`,
    null, null)
}
