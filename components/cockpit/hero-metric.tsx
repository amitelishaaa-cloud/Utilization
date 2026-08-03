import { utilizationColorClass } from '@/lib/calculations/cockpit-helpers'
import type { HeroMonth } from '@/lib/calculations/cockpit-helpers'

export function HeroMetric({ heroMonth }: { heroMonth: HeroMonth }) {
  const pct = Math.round(heroMonth.utilization * 100)
  const overload = heroMonth.nextMonthOverload

  if (overload) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
        <div className="flex gap-12">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">{heroMonth.monthLabel}</p>
            <p className={`text-6xl font-bold ${utilizationColorClass(heroMonth.utilization)}`}>
              {pct}%
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">{overload.monthLabel}</p>
            <p className={`text-6xl font-bold ${utilizationColorClass(overload.utilization)}`}>
              {Math.round(overload.utilization * 100)}%
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
      <p className="text-xs font-medium text-gray-500 mb-2">
        ניצול — {heroMonth.monthLabel}
      </p>
      <p className={`text-6xl font-bold ${utilizationColorClass(heroMonth.utilization)}`}>
        {pct}%
      </p>
    </div>
  )
}
