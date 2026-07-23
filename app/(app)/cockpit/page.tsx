import { fetchUtilization } from '@/lib/calculations/fetcher'
import { getDevUserId } from '@/lib/supabase/server'
import {
  getStartOfCurrentWeek,
  addMonths,
  getHeroMonth,
  groupWeeksByMonth,
} from '@/lib/calculations/cockpit-helpers'
import { HeroMetric } from '@/components/cockpit/hero-metric'
import { ForecastColumns } from '@/components/cockpit/forecast-columns'
import { RecommendationBlock } from '@/components/cockpit/recommendation-block'
import { ForecastBlurGate } from '@/components/cockpit/forecast-blur-gate'

export const dynamic = 'force-dynamic'

function EmptyState() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
      <p className="text-gray-500 mb-1">אין נתונים לתצוגה</p>
      <p className="text-sm text-gray-400">
        הוסף פרויקט, רטיינר, או עסקת pipeline כדי לראות את תחזית הניצול שלך.
      </p>
    </div>
  )
}

export default async function CockpitPage() {
  const userId = getDevUserId()
  const startDate = getStartOfCurrentWeek()
  const endDate = addMonths(startDate, 3)

  const { weeks, recommendation, plan } = await fetchUtilization(
    userId,
    startDate,
    endDate,
  )

  const hasData = weeks.some(w => w.committedHours + w.pipelineHours > 0)
  const heroMonth = getHeroMonth(weeks, recommendation)
  const months = groupWeeksByMonth(weeks)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">לוח בקרה</h1>
        <p className="text-sm text-gray-500 mt-1">תחזית ניצול ל-3 חודשים</p>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <HeroMetric heroMonth={heroMonth} />
          <ForecastBlurGate plan={plan}>
            <ForecastColumns months={months} />
            <RecommendationBlock recommendation={recommendation} />
          </ForecastBlurGate>
        </>
      )}
    </div>
  )
}
