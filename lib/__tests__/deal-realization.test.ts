import { describe, it, expect } from 'vitest'
import { buildProjectDefaults, buildRetainerDefaults } from '@/lib/deal-realization'
import type { PipelineDeal } from '@/lib/types'

function makeDeal(overrides: Partial<PipelineDeal> = {}): PipelineDeal {
  return {
    id: 'deal-1',
    user_id: 'user-1',
    client_id: 'client-1',
    name: 'אתר לחברת XYZ',
    deal_type: 'project',
    pricing_type: 'hourly',
    estimated_hours: 80,
    monthly_hours: null,
    hourly_rate: 250,
    fixed_price: null,
    expected_start_date: '2026-09-01',
    expected_end_date: '2026-10-31',
    current_stage: 'contract',
    probability_override: null,
    status: 'won',
    notes: null,
    priority: null,
    reminder_date: null,
    created_at: '2026-08-01T00:00:00Z',
    closed_at: '2026-08-03T00:00:00Z',
    ...overrides,
  }
}

describe('buildProjectDefaults', () => {
  it('מעתיק את שדות העסקה לשדות הפרויקט המקבילים', () => {
    const d = buildProjectDefaults(makeDeal())

    expect(d).toMatchObject({
      client_id: 'client-1',
      name: 'אתר לחברת XYZ',
      pricing_type: 'hourly',
      estimated_hours: 80,
      hourly_rate: 250,
      fixed_price: null,
      start_date: '2026-09-01',
      end_date: '2026-10-31',
    })
  })

  it('מסמן את תאריך הסיום כמוערך — מקורו ב-expected_end_date', () => {
    expect(buildProjectDefaults(makeDeal()).is_end_date_estimated).toBe(true)
  })

  it('שומר על תמחור fixed כמו שהוא (אותו enum בשתי הטבלאות)', () => {
    const d = buildProjectDefaults(
      makeDeal({ pricing_type: 'fixed', hourly_rate: null, fixed_price: 20000 }),
    )
    expect(d.pricing_type).toBe('fixed')
    expect(d.fixed_price).toBe(20000)
    expect(d.hourly_rate).toBeNull()
  })

  it('משאיר client_id כ-null כשלעסקה אין לקוח — המודאל הוא שידרוש אותו', () => {
    expect(buildProjectDefaults(makeDeal({ client_id: null })).client_id).toBeNull()
  })

  it('מוריש notes, priority ו-reminder_date מהעסקה לפרויקט', () => {
    const d = buildProjectDefaults(
      makeDeal({ notes: 'לתאם קיקאוף', priority: 5, reminder_date: '2026-09-15' }),
    )

    expect(d).toMatchObject({
      notes: 'לתאם קיקאוף',
      priority: 5,
      reminder_date: '2026-09-15',
    })
  })
})

describe('buildRetainerDefaults', () => {
  function makeRetainerDeal(overrides: Partial<PipelineDeal> = {}) {
    return makeDeal({
      deal_type: 'retainer',
      estimated_hours: null,
      monthly_hours: 20,
      ...overrides,
    })
  }

  it('ממפה monthly_hours ותאריכים', () => {
    const d = buildRetainerDefaults(makeRetainerDeal())

    expect(d).toMatchObject({
      client_id: 'client-1',
      name: 'אתר לחברת XYZ',
      monthly_hours: 20,
      start_date: '2026-09-01',
      end_date: '2026-10-31',
    })
  })

  it("ממפה pricing_type מ-'fixed' ל-'fixed_monthly'", () => {
    const d = buildRetainerDefaults(
      makeRetainerDeal({ pricing_type: 'fixed', hourly_rate: null, fixed_price: 20000 }),
    )
    expect(d.pricing_type).toBe('fixed_monthly')
  })

  it("משאיר pricing_type 'hourly' על כנו ומעתיק את התעריף", () => {
    const d = buildRetainerDefaults(makeRetainerDeal())
    expect(d.pricing_type).toBe('hourly')
    expect(d.hourly_rate).toBe(250)
  })

  it('לעולם לא מעתיק את fixed_price ל-monthly_fixed_price — זה מחיר כולל מול חודשי', () => {
    const d = buildRetainerDefaults(
      makeRetainerDeal({ pricing_type: 'fixed', hourly_rate: null, fixed_price: 20000 }),
    )
    expect(d.monthly_fixed_price).toBeNull()
  })

  it('שומר על ריטיינר פתוח — expected_end_date ריק נשאר null', () => {
    const d = buildRetainerDefaults(makeRetainerDeal({ expected_end_date: null }))
    expect(d.end_date).toBeNull()
  })

  it('מוריש notes בלבד — ל-retainers אין עמודות priority ו-reminder_date', () => {
    const d = buildRetainerDefaults(
      makeRetainerDeal({ notes: 'ריטיינר חודשי קבוע', priority: 5, reminder_date: '2026-09-15' }),
    )

    expect(d.notes).toBe('ריטיינר חודשי קבוע')
    expect(d).not.toHaveProperty('priority')
    expect(d).not.toHaveProperty('reminder_date')
  })
})
