import { formatCurrency } from '@/lib/utils'
import type { MonthRevenue } from '@/lib/calculations/revenue'

/**
 * הכנסה צפויה לחודש הקלנדרי הנוכחי, לצד מדד הניצול.
 *
 * הבלור ל-free tier מיושם כאן inline ולא דרך `ForecastBlurGate` — ה-gate ההוא
 * מציב overlay עם כרטיס CTA בגודל מלא, ושני כרטיסי CTA באותו מסך היו רעש.
 * ה-CTA עצמו מופיע מיד מתחת, על עמודות התחזית.
 */
export function RevenueMetric({
  revenue,
  plan,
}: {
  revenue: MonthRevenue
  plan: 'free' | 'pro'
}) {
  const amount = formatCurrency(revenue.total)

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">
        הכנסה צפויה — {revenue.monthLabel} (חודש מלא)
      </p>
      {plan === 'pro' ? (
        <p className="text-3xl font-bold text-gray-900">{amount}</p>
      ) : (
        <p className="text-3xl font-bold text-gray-900">
          <span className="blur-sm select-none" aria-hidden="true">
            {amount}
          </span>
          <span className="sr-only">זמין למנויי פרו</span>
        </p>
      )}
    </div>
  )
}
