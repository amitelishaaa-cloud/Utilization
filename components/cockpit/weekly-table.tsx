import { parseDate, toDateStr } from '@/lib/calculations/utilization'
import { utilizationColorClass } from '@/lib/calculations/cockpit-helpers'
import { formatDate } from '@/lib/utils'
import type { WeekBreakdown } from '@/lib/calculations/types'

/** יום ראשון של אותו שבוע — 6 ימים אחרי יום שני. */
function weekEndOf(weekStart: string): string {
  const end = parseDate(weekStart)
  end.setUTCDate(end.getUTCDate() + 6)
  return toDateStr(end)
}

/**
 * טבלת פירוק שבועי מלאה — לכל שבוע בטווח: תאריכי התחלה/סיום, קיבולת,
 * שעות מחויבות, שעות pipeline, סה"כ, וניצול. אותו חלון זמן ואותם נתונים
 * שמזינים את ה-hero metric ואת ForecastColumns — לא מקור חישוב נפרד.
 */
export function WeeklyTable({ weeks }: { weeks: WeekBreakdown[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 overflow-x-auto">
      <p className="text-xs font-medium text-gray-500 mb-4">פירוט שבועי מלא</p>
      <table className="w-full text-sm text-start">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="py-2 px-2 font-medium text-start">שבוע</th>
            <th className="py-2 px-2 font-medium text-start">קיבולת</th>
            <th className="py-2 px-2 font-medium text-start">שעות מחויבות</th>
            <th className="py-2 px-2 font-medium text-start">שעות Pipeline</th>
            <th className="py-2 px-2 font-medium text-start">סה&quot;כ שעות</th>
            <th className="py-2 px-2 font-medium text-start">ניצול</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map(week => {
            const total = week.committedHours + week.pipelineHours
            return (
              <tr key={week.weekStart} className="border-b border-gray-50 last:border-0">
                <td className="py-2 px-2 text-gray-700 whitespace-nowrap">
                  {formatDate(week.weekStart)}–{formatDate(weekEndOf(week.weekStart))}
                </td>
                <td className="py-2 px-2 text-gray-700">{week.capacity.toFixed(1)}</td>
                <td className="py-2 px-2 text-gray-700">{week.committedHours.toFixed(1)}</td>
                <td className="py-2 px-2 text-gray-700">{week.pipelineHours.toFixed(1)}</td>
                <td className="py-2 px-2 text-gray-700 font-medium">{total.toFixed(1)}</td>
                <td className={`py-2 px-2 font-semibold ${utilizationColorClass(week.utilization)}`}>
                  {Math.round(week.utilization * 100)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
