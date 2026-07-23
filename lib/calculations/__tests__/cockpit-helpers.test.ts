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
import type { WeekBreakdown, RecommendationResult } from '@/lib/calculations/types'

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
  const allWeeks = [...julyWeeks, ...augWeeks]

  it('uses affectedMonthIndex=2 when recommendation points to month 2', () => {
    const rec: RecommendationResult = {
      tag: 'mid_gap', color: 'orange', text: '',
      affectedMonthIndex: 2, affectedMonthUtilization: 0.30,
    }
    const hero = getHeroMonth(allWeeks, rec)
    expect(hero.monthIndex).toBe(2)
    expect(hero.utilization).toBeCloseTo(0.30, 4)
    expect(hero.monthLabel).toBe('אוגוסט 2026')
  })

  it('falls back to month 1 when affectedMonthIndex is null (optimal)', () => {
    const rec: RecommendationResult = {
      tag: 'optimal', color: 'green', text: '',
      affectedMonthIndex: null, affectedMonthUtilization: null,
    }
    const hero = getHeroMonth(allWeeks, rec)
    expect(hero.monthIndex).toBe(1)
    expect(hero.utilization).toBeCloseTo(0.85, 4)
    expect(hero.monthLabel).toBe('יולי 2026')
  })

  it('returns 0% utilization when weeks is empty and affectedMonthIndex is null', () => {
    const rec: RecommendationResult = {
      tag: 'optimal', color: 'green', text: '',
      affectedMonthIndex: null, affectedMonthUtilization: null,
    }
    const hero = getHeroMonth([], rec)
    expect(hero.utilization).toBe(0)
    expect(hero.monthIndex).toBe(1)
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
