import { describe, it, expect } from 'vitest'
import { calcRecommendation } from '@/lib/calculations/recommendations'
import type { WeekBreakdown } from '@/lib/calculations/types'

// Sets committedHours = utilization × capacity so the monthly math works out.
function makeWeeks(
  configs: Array<{ weekStart: string; utilization: number; capacity?: number }>,
): WeekBreakdown[] {
  return configs.map(({ weekStart, utilization, capacity = 40 }) => ({
    weekStart,
    capacity,
    committedHours: utilization * capacity,
    pipelineHours: 0,
    utilization,
  }))
}

describe('calcRecommendation', () => {
  // All months in the optimal range (80–90%) → green, no affected month
  it('all months optimal → optimal green, no affected month', () => {
    const weeks = makeWeeks([
      { weekStart: '2025-07-07', utilization: 0.85 },
      { weekStart: '2025-07-14', utilization: 0.88 },
      { weekStart: '2025-07-21', utilization: 0.83 },
      { weekStart: '2025-07-28', utilization: 0.86 },
    ])
    const result = calcRecommendation(weeks)
    expect(result.tag).toBe('optimal')
    expect(result.color).toBe('green')
    expect(result.affectedMonthIndex).toBeNull()
    expect(result.affectedMonthUtilization).toBeNull()
  })

  // First month <50% → revenue gap, returns which month and actual utilization
  it('first month <50% → urgent_gap dark_red, monthIndex=1, utilization≈0.3', () => {
    const weeks = makeWeeks([
      { weekStart: '2025-07-07', utilization: 0.3 },
      { weekStart: '2025-07-14', utilization: 0.3 },
      { weekStart: '2025-07-21', utilization: 0.3 },
      { weekStart: '2025-07-28', utilization: 0.3 },
    ])
    const result = calcRecommendation(weeks)
    expect(result.tag).toBe('urgent_gap')
    expect(result.color).toBe('dark_red')
    expect(result.affectedMonthIndex).toBe(1)
    expect(result.affectedMonthUtilization).toBeCloseTo(0.3, 4)
  })

  // First month optimal; second month <50% → monthIndex=2
  it('second month <50%, first optimal → mid_gap orange, monthIndex=2', () => {
    const weeks = makeWeeks([
      { weekStart: '2025-07-07', utilization: 0.85 },
      { weekStart: '2025-07-14', utilization: 0.85 },
      { weekStart: '2025-07-21', utilization: 0.85 },
      { weekStart: '2025-07-28', utilization: 0.85 },
      { weekStart: '2025-08-04', utilization: 0.3 },
      { weekStart: '2025-08-11', utilization: 0.3 },
      { weekStart: '2025-08-18', utilization: 0.3 },
      { weekStart: '2025-08-25', utilization: 0.3 },
    ])
    const result = calcRecommendation(weeks)
    expect(result.tag).toBe('mid_gap')
    expect(result.color).toBe('orange')
    expect(result.affectedMonthIndex).toBe(2)
    expect(result.affectedMonthUtilization).toBeCloseTo(0.3, 4)
  })

  // Any month >110% → overbooking, returns the overloaded month's data
  it('>110% → overload red, monthIndex=1, utilization≈1.175', () => {
    const weeks = makeWeeks([
      { weekStart: '2025-07-07', utilization: 1.2 },
      { weekStart: '2025-07-14', utilization: 1.15 },
    ])
    const result = calcRecommendation(weeks)
    expect(result.tag).toBe('overload')
    expect(result.color).toBe('red')
    expect(result.affectedMonthIndex).toBe(1)
    // monthly utilization = (1.2×40 + 1.15×40) / (40+40) = (48+46)/80 = 94/80 = 1.175
    expect(result.affectedMonthUtilization).toBeCloseTo(1.175, 4)
  })

  // overload in a later month beats warning in an earlier month
  it('overload in month 2 wins over warning in month 1', () => {
    const weeks = makeWeeks([
      // Month 1 — July: 65% (warning range)
      { weekStart: '2025-07-07', utilization: 0.65 },
      { weekStart: '2025-07-14', utilization: 0.65 },
      { weekStart: '2025-07-21', utilization: 0.65 },
      { weekStart: '2025-07-28', utilization: 0.65 },
      // Month 2 — August: 115% (overload)
      { weekStart: '2025-08-04', utilization: 1.15 },
      { weekStart: '2025-08-11', utilization: 1.15 },
      { weekStart: '2025-08-18', utilization: 1.15 },
      { weekStart: '2025-08-25', utilization: 1.15 },
    ])
    const result = calcRecommendation(weeks)
    expect(result.tag).toBe('overload')
    expect(result.color).toBe('red')
    expect(result.affectedMonthIndex).toBe(2)
    expect(result.affectedMonthUtilization).toBeCloseTo(1.15, 4)
  })

  // All months optimal but 2+ months >90% → sustained_high, no specific affected month
  it('2+ months >90% → sustained_high blue, no affected month', () => {
    const weeks = makeWeeks([
      { weekStart: '2025-07-07', utilization: 0.95 },
      { weekStart: '2025-07-14', utilization: 0.95 },
      { weekStart: '2025-07-21', utilization: 0.95 },
      { weekStart: '2025-07-28', utilization: 0.95 },
      { weekStart: '2025-08-04', utilization: 0.92 },
      { weekStart: '2025-08-11', utilization: 0.92 },
      { weekStart: '2025-08-18', utilization: 0.92 },
      { weekStart: '2025-08-25', utilization: 0.92 },
    ])
    const result = calcRecommendation(weeks)
    expect(result.tag).toBe('sustained_high')
    expect(result.color).toBe('blue')
    expect(result.affectedMonthIndex).toBeNull()
    expect(result.affectedMonthUtilization).toBeNull()
  })

  // first month in warning range (50–79%), no gaps or overload
  it('first month in warning range → warning yellow, monthIndex=1', () => {
    const weeks = makeWeeks([
      { weekStart: '2026-07-06', utilization: 0.65 },
      { weekStart: '2026-07-13', utilization: 0.65 },
      { weekStart: '2026-07-20', utilization: 0.65 },
      { weekStart: '2026-07-27', utilization: 0.65 },
    ])
    const result = calcRecommendation(weeks)
    expect(result.tag).toBe('warning')
    expect(result.color).toBe('yellow')
    expect(result.affectedMonthIndex).toBe(1)
    expect(result.affectedMonthUtilization).toBeCloseTo(0.65, 4)
  })

  // months 1+2 are healthy; month 3 has <50% → far_gap, monthIndex=3
  it('third month <50%, first two healthy → far_gap yellow, monthIndex=3', () => {
    const weeks = makeWeeks([
      // July — month 1 (85%)
      { weekStart: '2026-07-06', utilization: 0.85 },
      { weekStart: '2026-07-13', utilization: 0.85 },
      { weekStart: '2026-07-20', utilization: 0.85 },
      { weekStart: '2026-07-27', utilization: 0.85 },
      // August — month 2 (85%)
      { weekStart: '2026-08-03', utilization: 0.85 },
      { weekStart: '2026-08-10', utilization: 0.85 },
      { weekStart: '2026-08-17', utilization: 0.85 },
      { weekStart: '2026-08-24', utilization: 0.85 },
      // September — month 3 (30%, far_gap)
      { weekStart: '2026-09-07', utilization: 0.30 },
      { weekStart: '2026-09-14', utilization: 0.30 },
      { weekStart: '2026-09-21', utilization: 0.30 },
      { weekStart: '2026-09-28', utilization: 0.30 },
    ])
    const result = calcRecommendation(weeks)
    expect(result.tag).toBe('far_gap')
    expect(result.color).toBe('yellow')
    expect(result.affectedMonthIndex).toBe(3)
    expect(result.affectedMonthUtilization).toBeCloseTo(0.30, 4)
  })
})
