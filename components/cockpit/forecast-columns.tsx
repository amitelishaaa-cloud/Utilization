'use client'

import { useState } from 'react'
import { utilizationBarColorClass } from '@/lib/calculations/cockpit-helpers'
import type { MonthSummary } from '@/lib/calculations/cockpit-helpers'

export function ForecastColumns({ months }: { months: MonthSummary[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
      <p className="text-xs font-medium text-gray-500 mb-4">תחזית חודשית</p>

      {/* Bar chart */}
      <div className="flex gap-4 items-end" style={{ height: '128px' }}>
        {months.map((month, i) => {
          const heightPct = Math.min(Math.round(month.utilization * 100), 100)
          const isActive = activeIdx === i
          return (
            <button
              key={month.yearMonth}
              className="flex-1 flex flex-col items-center gap-1 focus:outline-none"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={() => setActiveIdx(isActive ? null : i)}
              aria-label={`${month.monthLabel}: ${Math.round(month.utilization * 100)}%`}
            >
              <span className="text-xs text-gray-500">
                {Math.round(month.utilization * 100)}%
              </span>
              <div className="w-full relative flex-1">
                <div
                  className={`absolute bottom-0 w-full rounded-t-md transition-opacity ${utilizationBarColorClass(month.utilization)} ${isActive ? 'opacity-100' : 'opacity-70'}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 text-center leading-tight">
                {month.monthLabel}
              </span>
            </button>
          )
        })}
      </div>

      {/* Per-week breakdown (shown on hover/click) */}
      {activeIdx !== null && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            פירוט שבועי — {months[activeIdx].monthLabel}
          </p>
          <div className="space-y-1">
            {months[activeIdx].weeks.map(week => (
              <div
                key={week.weekStart}
                className="flex justify-between text-xs text-gray-600"
              >
                <span>{week.weekStart}</span>
                <span>{Math.round(week.utilization * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
