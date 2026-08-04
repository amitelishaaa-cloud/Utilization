import { describe, it, expect } from 'vitest'
import {
  groupWeeksByMonth,
  getHeroMonth,
  getStartOfCurrentWeek,
  addMonths,
  formatMonthLabel,
  utilizationColorClass,
  utilizationBarColorClass,
} from '@/lib/calculations/cockpit-helpers'
import type { WeekBreakdown } from '@/lib/calculations/types'

// ── groupWeeksByMonth ────────────────────────────────────────────────────────

describe('groupWeeksByMonth', () => {
  it('groups 8 weeks across 2 calendar months', () => {
    const weeks: WeekBreakdown[] = [
      { weekStart: '2026-07-06', committedHours: 34, pipelineHours: 0, capacity: 40, utilization: 0.85 },
      { weekStart: '2026-07-13', committedHours: 34, pipelineHours: 0, capacity: 40, utilization: 0.85 },
      { weekStart: '2026-07-20', committedHours: 34, pipelineHours: 0, capacity: 40, utilization: 0.85 },
      { weekStart: '2026-07-27', committedHours: 34, pipelineHours: 0, capacity: 40, utilization: 0.85 },
      { weekStart: '2026-08-03', committedHours: 20, pipelineHours: 0, capacity: 40, utilization: 0.50 },
      { weekStart: '2026-08-10', committedHours: 20, pipelineHours: 0, capacity: 40, utilization: 0.50 },
      { weekStart: '2026-08-17', committedHours: 20, pipelineHours: 0, capacity: 40, utilization: 0.50 },
      { weekStart: '2026-08-24', committedHours: 20, pipelineHours: 0, capacity: 40, utilization: 0.50 },
    ]
    const months = groupWeeksByMonth(weeks)
    expect(months).toHaveLength(2)
    expect(months[0].yearMonth).toBe('2026-07')
    expect(months[0].monthLabel).toBe('יולי 2026')
    expect(months[0].monthIndex).toBe(1)
    expect(months[0].utilization).toBeCloseTo(0.85, 4)
    expect(months[0].weeks).toHaveLength(4)
    expect(months[1].yearMonth).toBe('2026-08')
    expect(months[1].monthLabel).toBe('אוגוסט 2026')
    expect(months[1].monthIndex).toBe(2)
    expect(months[1].utilization).toBeCloseTo(0.50, 4)
    expect(months[1].weeks).toHaveLength(4)
  })

  it('returns empty array for empty input', () => {
    expect(groupWeeksByMonth([])).toEqual([])
  })

  // שבוע גבול (יום שני 31/08/2026): ראשון+שני (30-31/08) שייכים לאוגוסט,
  // שלישי-רביעי-חמישי (1-3/09) שייכים לספטמבר. הקיבולת נפרסת 2/5 לאוגוסט
  // ו-3/5 לספטמבר — לא מיוחסת במלואה לחודש שמכיל את מפתח יום השני.
  it('פורסת קיבולת של שבוע גבול לפי ימי עבודה (5-יומי) בכל חודש', () => {
    const weeks: WeekBreakdown[] = [
      // שבוע מלא באוגוסט — ללא שינוי
      { weekStart: '2026-08-24', committedHours: 20, pipelineHours: 0, capacity: 40, utilization: 0.5 },
      // שבוע גבול: 31/08 (יום שני) — ראשון 30/08, שני 31/08 (אוגוסט) | שלישי-רביעי-חמישי 1-3/09 (ספטמבר)
      { weekStart: '2026-08-31', committedHours: 20, pipelineHours: 0, capacity: 40, utilization: 0.5 },
      // שבוע מלא בספטמבר — ללא שינוי
      { weekStart: '2026-09-07', committedHours: 20, pipelineHours: 0, capacity: 40, utilization: 0.5 },
    ]
    const months = groupWeeksByMonth(weeks)

    expect(months).toHaveLength(2)
    const august = months.find(m => m.yearMonth === '2026-08')!
    const september = months.find(m => m.yearMonth === '2026-09')!

    // אוגוסט: שבוע מלא (40) + שבוע גבול פרוס 2/5×40=16 → 56
    expect(august.weeks).toHaveLength(2) // חברות ה-weeks לתצוגה נשארת כפי שהייתה

    // ספטמבר: שבוע גבול פרוס 3/5×40=24 + שבוע מלא (40) → 64
    expect(september.weeks).toHaveLength(1)

    // totalHours נשאר ללא פרואטה (החלטה מפורשת — רק קיבולת מתפרסת):
    // אוגוסט totalHours = 20+20=40, totalCapacity=56 → utilization = 40/56
    expect(august.utilization).toBeCloseTo(40 / 56, 4)
    // ספטמבר totalHours = 20 (רק השבוע ה'שייך' לספטמבר לפי מפתח יום שני), totalCapacity=64 → 20/64
    expect(september.utilization).toBeCloseTo(20 / 64, 4)
  })

  it('שבוע שכולו בתוך חודש אחד לא מושפע מהפריסה — התנהגות זהה לישן', () => {
    const weeks: WeekBreakdown[] = [
      { weekStart: '2026-07-06', committedHours: 34, pipelineHours: 0, capacity: 40, utilization: 0.85 },
    ]
    const months = groupWeeksByMonth(weeks)
    expect(months[0].utilization).toBeCloseTo(34 / 40, 4)
  })

  it('uses capacity-weighted formula when weeks have different capacities (capacity_exceptions)', () => {
    const weeks: WeekBreakdown[] = [
      // Week 1: normal capacity → 80% utilization
      { weekStart: '2026-07-06', committedHours: 32, pipelineHours: 0, capacity: 40, utilization: 0.80 },
      // Week 2: half capacity (capacity_exception) → 90% utilization
      { weekStart: '2026-07-13', committedHours: 18, pipelineHours: 0, capacity: 20, utilization: 0.90 },
    ]
    const months = groupWeeksByMonth(weeks)
    expect(months).toHaveLength(1)
    // Capacity-weighted: (32+18) / (40+20) = 50/60 ≈ 0.8333
    // Simple average would give (0.80+0.90)/2 = 0.85 — wrong
    expect(months[0].utilization).toBeCloseTo(50 / 60, 4)
  })
})

// ── getHeroMonth ─────────────────────────────────────────────────────────────

describe('getHeroMonth', () => {
  const julyWeeks: WeekBreakdown[] = [
    { weekStart: '2026-07-06', committedHours: 34, pipelineHours: 0, capacity: 40, utilization: 0.85 },
    { weekStart: '2026-07-13', committedHours: 34, pipelineHours: 0, capacity: 40, utilization: 0.85 },
  ]
  const augWeeks: WeekBreakdown[] = [
    { weekStart: '2026-08-03', committedHours: 12, pipelineHours: 0, capacity: 40, utilization: 0.30 },
    { weekStart: '2026-08-10', committedHours: 12, pipelineHours: 0, capacity: 40, utilization: 0.30 },
  ]
  const augOverloadWeeks: WeekBreakdown[] = [
    { weekStart: '2026-08-03', committedHours: 48, pipelineHours: 0, capacity: 40, utilization: 1.2 },
    { weekStart: '2026-08-10', committedHours: 48, pipelineHours: 0, capacity: 40, utilization: 1.2 },
  ]
  const today = new Date(2026, 6, 15) // July 15, 2026 local time (month is 0-indexed)

  it('returns current calendar month utilization', () => {
    const hero = getHeroMonth([...julyWeeks, ...augWeeks], today)
    expect(hero.monthIndex).toBe(1)
    expect(hero.utilization).toBeCloseTo(0.85, 4)
    expect(hero.monthLabel).toBe('יולי 2026')
  })

  it('does not include nextMonthOverload when next month is below overload threshold', () => {
    const hero = getHeroMonth([...julyWeeks, ...augWeeks], today)
    expect(hero.nextMonthOverload).toBeUndefined()
  })

  it('includes nextMonthOverload when next month exceeds overload threshold', () => {
    const hero = getHeroMonth([...julyWeeks, ...augOverloadWeeks], today)
    expect(hero.nextMonthOverload).toBeDefined()
    expect(hero.nextMonthOverload?.monthIndex).toBe(2)
    expect(hero.nextMonthOverload?.utilization).toBeCloseTo(1.2, 4)
    expect(hero.nextMonthOverload?.monthLabel).toBe('אוגוסט 2026')
  })

  it('does not include nextMonthOverload when next month is exactly at overload threshold (not strictly above)', () => {
    // 44/40 = 1.1 exactly — not > 1.1, so no overload
    const atThresholdWeeks: WeekBreakdown[] = [
      { weekStart: '2026-08-03', committedHours: 44, pipelineHours: 0, capacity: 40, utilization: 1.1 },
    ]
    const hero = getHeroMonth([...julyWeeks, ...atThresholdWeeks], today)
    expect(hero.nextMonthOverload).toBeUndefined()
  })

  it('returns 0% with correct label when current month is not in weeks', () => {
    const sep = new Date(2026, 8, 15) // September 15, 2026 local time
    const hero = getHeroMonth([...julyWeeks, ...augWeeks], sep)
    expect(hero.utilization).toBe(0)
    expect(hero.monthLabel).toBe('ספטמבר 2026')
    expect(hero.nextMonthOverload).toBeUndefined()
  })

  it('returns 0% when weeks is empty', () => {
    const hero = getHeroMonth([], today)
    expect(hero.utilization).toBe(0)
    expect(hero.monthLabel).toBe('יולי 2026')
    expect(hero.nextMonthOverload).toBeUndefined()
  })
})

// ── date utilities ────────────────────────────────────────────────────────────

describe('getStartOfCurrentWeek', () => {
  it('returns Monday when input is a Thursday', () => {
    // 2026-07-23 is a Thursday
    const result = getStartOfCurrentWeek(new Date('2026-07-23T10:00:00'))
    expect(result.toISOString().slice(0, 10)).toBe('2026-07-20')
  })

  it('returns same day when input is a Monday', () => {
    const result = getStartOfCurrentWeek(new Date('2026-07-20T10:00:00'))
    expect(result.toISOString().slice(0, 10)).toBe('2026-07-20')
  })

  it('returns previous Monday when input is a Sunday', () => {
    // 2026-07-26 is a Sunday
    const result = getStartOfCurrentWeek(new Date('2026-07-26T10:00:00'))
    expect(result.toISOString().slice(0, 10)).toBe('2026-07-20')
  })
})

describe('addMonths', () => {
  it('adds 3 months to a date', () => {
    const result = addMonths(new Date('2026-07-20'), 3)
    expect(result.toISOString().slice(0, 10)).toBe('2026-10-20')
  })
})

// ── formatMonthLabel ──────────────────────────────────────────────────────────

describe('formatMonthLabel', () => {
  it('formats July 2026', () => expect(formatMonthLabel('2026-07')).toBe('יולי 2026'))
  it('formats January 2026', () => expect(formatMonthLabel('2026-01')).toBe('ינואר 2026'))
  it('formats December 2025', () => expect(formatMonthLabel('2025-12')).toBe('דצמבר 2025'))
})

// ── color helpers ─────────────────────────────────────────────────────────────

describe('utilizationColorClass', () => {
  it('< 50% → red-600', () => expect(utilizationColorClass(0.3)).toBe('text-red-600'))
  it('50–79% → yellow-600', () => expect(utilizationColorClass(0.65)).toBe('text-yellow-600'))
  it('80–110% → green-600', () => expect(utilizationColorClass(0.9)).toBe('text-green-600'))
  it('> 110% → red-900', () => expect(utilizationColorClass(1.2)).toBe('text-red-900'))
  // boundary checks
  it('exactly 50% → yellow-600', () => expect(utilizationColorClass(0.5)).toBe('text-yellow-600'))
  it('exactly 80% → green-600', () => expect(utilizationColorClass(0.8)).toBe('text-green-600'))
  it('exactly 110% → green-600', () => expect(utilizationColorClass(1.1)).toBe('text-green-600'))
  it('110.1% → red-900', () => expect(utilizationColorClass(1.101)).toBe('text-red-900'))
})

describe('utilizationBarColorClass', () => {
  it('< 50% → bg-red-400', () => expect(utilizationBarColorClass(0.3)).toBe('bg-red-400'))
  it('50–79% → bg-yellow-400', () => expect(utilizationBarColorClass(0.65)).toBe('bg-yellow-400'))
  it('80–110% → bg-green-500', () => expect(utilizationBarColorClass(0.9)).toBe('bg-green-500'))
  it('> 110% → bg-red-900', () => expect(utilizationBarColorClass(1.2)).toBe('bg-red-900'))
  // boundary checks
  it('exactly 50% → bg-yellow-400', () => expect(utilizationBarColorClass(0.5)).toBe('bg-yellow-400'))
  it('exactly 80% → bg-green-500', () => expect(utilizationBarColorClass(0.8)).toBe('bg-green-500'))
  it('exactly 110% → bg-green-500', () => expect(utilizationBarColorClass(1.1)).toBe('bg-green-500'))
  it('110.1% → bg-red-900', () => expect(utilizationBarColorClass(1.101)).toBe('bg-red-900'))
})
