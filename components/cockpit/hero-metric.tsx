import type { ReactNode } from 'react'
import { utilizationColorClass } from '@/lib/calculations/cockpit-helpers'
import type { HeroMonth } from '@/lib/calculations/cockpit-helpers'

export function HeroMetric({
  heroMonth,
  revenue,
}: {
  heroMonth: HeroMonth
  /** מדד נלווה שמוצג לצד הניצול — כרגע ההכנסה הצפויה. */
  revenue?: ReactNode
}) {
  const pct = Math.round(heroMonth.utilization * 100)
  const overload = heroMonth.nextMonthOverload

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
      <div className="flex flex-wrap gap-x-12 gap-y-6">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">
            ניצול — {heroMonth.monthLabel}
          </p>
          <p className={`text-6xl font-bold ${utilizationColorClass(heroMonth.utilization)}`}>
            {pct}%
          </p>
        </div>

        {overload && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              ניצול — {overload.monthLabel}
            </p>
            <p className={`text-6xl font-bold ${utilizationColorClass(overload.utilization)}`}>
              {Math.round(overload.utilization * 100)}%
            </p>
          </div>
        )}

        {revenue}
      </div>
    </div>
  )
}
