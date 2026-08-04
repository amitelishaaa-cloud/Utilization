import { describe, it, expect } from 'vitest'
import { calcWeeklyUtilization } from '@/lib/calculations/utilization'
import { calcRecommendation } from '@/lib/calculations/recommendations'
import type { UtilizationInput } from '@/lib/calculations/types'
import type {
  Project,
  Retainer,
  PipelineDeal,
  ProjectWeeklyAllocation,
  CapacityException,
} from '@/lib/types'

// ── Factories ──────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    user_id: 'user-1',
    client_id: 'client-1',
    source_deal_id: null,
    name: 'Test Project',
    pricing_type: 'hourly',
    estimated_hours: 40,
    actual_hours: null,
    hourly_rate: 100,
    fixed_price: null,
    start_date: '2025-07-07',
    end_date: '2025-07-27',
    is_end_date_estimated: false,
    status: 'active',
    notes: null,
    priority: null,
    reminder_date: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeDeal(overrides: Partial<PipelineDeal> = {}): PipelineDeal {
  return {
    id: 'deal-1',
    user_id: 'user-1',
    client_id: null,
    name: 'Test Deal',
    deal_type: 'project',
    monthly_hours: null,
    pricing_type: 'hourly',
    estimated_hours: 40,
    hourly_rate: 100,
    fixed_price: null,
    expected_start_date: '2025-07-07',
    expected_end_date: '2025-07-20',
    current_stage: 'negotiation',
    probability_override: null,
    status: 'active',
    notes: null,
    priority: null,
    reminder_date: null,
    created_at: '2025-01-01T00:00:00Z',
    closed_at: null,
    ...overrides,
  }
}

function makeInput(overrides: Partial<UtilizationInput> = {}): UtilizationInput {
  return {
    defaultWeeklyHours: 40,
    worksFriday: false,
    startDate: new Date(Date.UTC(2025, 6, 7)),   // 2025-07-07
    endDate: new Date(Date.UTC(2025, 6, 21)),     // 2025-07-21
    projects: [],
    allocations: [],
    retainers: [],
    deals: [],
    capacityExceptions: [],
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('calcWeeklyUtilization', () => {
  // Scenario 1: project only, no pipeline
  // A project with manual allocations should produce exact committed hours;
  // pipeline hours should be 0; utilization = committed / capacity.
  it('project with manual allocations, no pipeline', () => {
    const project = makeProject()
    const allocations: ProjectWeeklyAllocation[] = [
      { id: 'a1', project_id: 'proj-1', week_start: '2025-07-07', allocated_hours: 15 },
      { id: 'a2', project_id: 'proj-1', week_start: '2025-07-14', allocated_hours: 15 },
      { id: 'a3', project_id: 'proj-1', week_start: '2025-07-21', allocated_hours: 10 },
    ]
    const input = makeInput({ projects: [project], allocations })
    const result = calcWeeklyUtilization(input)

    expect(result).toHaveLength(3)

    expect(result[0].weekStart).toBe('2025-07-07')
    expect(result[0].committedHours).toBe(15)
    expect(result[0].pipelineHours).toBe(0)
    expect(result[0].capacity).toBe(40)
    expect(result[0].utilization).toBeCloseTo(15 / 40, 5)

    expect(result[1].weekStart).toBe('2025-07-14')
    expect(result[1].committedHours).toBe(15)

    expect(result[2].weekStart).toBe('2025-07-21')
    expect(result[2].committedHours).toBe(10)
    expect(result[2].utilization).toBeCloseTo(10 / 40, 5)
  })

  // Equal-split fallback is day-based: a week gets the share of estimated_hours
  // matching the project days that fall inside it.
  // 2025-07-07 … 2025-07-28 is 22 days inclusive; a full week is 7/22 of them.
  it('project without allocations falls back to a day-based split', () => {
    const project = makeProject({
      estimated_hours: 60,
      start_date: '2025-07-07',
      end_date: '2025-07-28',
    })
    const input = makeInput({
      projects: [project],
      allocations: [],
      startDate: new Date(Date.UTC(2025, 6, 7)),
      endDate: new Date(Date.UTC(2025, 6, 7)),
    })
    const result = calcWeeklyUtilization(input)

    expect(result).toHaveLength(1)
    expect(result[0].committedHours).toBeCloseTo(60 * (7 / 22), 5)
  })

  // Regression: dividing by (end − start)/7 under-counts the project length in
  // weeks whenever it isn't a whole number of weeks, so every overlapping week
  // received a full weekly rate and the total exceeded estimated_hours.
  // 2026-08-01 … 2026-08-30 spans 5 calendar weeks; 75 h must stay 75 h.
  it('project hours summed across all its weeks equal estimated_hours exactly', () => {
    const project = makeProject({
      estimated_hours: 75,
      start_date: '2026-08-01', // Saturday — falls in the week starting 07-27
      end_date: '2026-08-30',
    })
    const input = makeInput({
      projects: [project],
      allocations: [],
      startDate: new Date(Date.UTC(2026, 6, 27)),
      endDate: new Date(Date.UTC(2026, 7, 31)),
    })
    const result = calcWeeklyUtilization(input)

    const total = result.reduce((sum, w) => sum + w.committedHours, 0)
    expect(total).toBeCloseTo(75, 5)
  })

  it('pipeline deal hours summed across all its weeks equal estimated_hours × probability', () => {
    const deal = makeDeal({
      estimated_hours: 75,
      expected_start_date: '2026-08-01',
      expected_end_date: '2026-08-30',
      current_stage: 'contract', // 1.0
    })
    const input = makeInput({
      deals: [deal],
      startDate: new Date(Date.UTC(2026, 6, 27)),
      endDate: new Date(Date.UTC(2026, 7, 31)),
    })
    const result = calcWeeklyUtilization(input)

    const total = result.reduce((sum, w) => sum + w.pipelineHours, 0)
    expect(total).toBeCloseTo(75, 5)
  })

  // Scenario 2: single pipeline deal at a middle stage
  // 2025-07-07 … 2025-07-20 is 14 days; a full week is half of them.
  // weekly_hours = 40 × 7/14 = 20; pipeline = 20 × 0.55
  it('single pipeline deal in negotiation stage (55%)', () => {
    const deal = makeDeal({
      estimated_hours: 40,
      expected_start_date: '2025-07-07',
      expected_end_date: '2025-07-20', // 13 days
      current_stage: 'negotiation',
      probability_override: null,
    })
    const input = makeInput({
      startDate: new Date(Date.UTC(2025, 6, 7)),
      endDate: new Date(Date.UTC(2025, 6, 7)),
      deals: [deal],
    })
    const result = calcWeeklyUtilization(input)

    expect(result).toHaveLength(1)
    const expectedPipeline = 40 * (7 / 14) * 0.55
    expect(result[0].pipelineHours).toBeCloseTo(expectedPipeline, 4)
    expect(result[0].committedHours).toBe(0)
    expect(result[0].utilization).toBeCloseTo(expectedPipeline / 40, 4)
  })

  // Scenario 3: multiple pipeline deals — contributions are summed
  it('multiple pipeline deals are summed per week', () => {
    const dealA = makeDeal({
      id: 'deal-a',
      estimated_hours: 20,
      expected_start_date: '2025-07-07',
      expected_end_date: '2025-07-20', // 13 days
      current_stage: 'negotiation', // 55%
    })
    const dealB = makeDeal({
      id: 'deal-b',
      estimated_hours: 30,
      expected_start_date: '2025-07-07',
      expected_end_date: '2025-07-20', // 13 days
      current_stage: 'proposal', // 30%
    })
    const input = makeInput({
      startDate: new Date(Date.UTC(2025, 6, 7)),
      endDate: new Date(Date.UTC(2025, 6, 7)),
      deals: [dealA, dealB],
    })
    const result = calcWeeklyUtilization(input)

    expect(result).toHaveLength(1)
    const expectedA = 20 * (7 / 14) * 0.55
    const expectedB = 30 * (7 / 14) * 0.30
    expect(result[0].pipelineHours).toBeCloseTo(expectedA + expectedB, 4)
  })

  // Scenario 4: probability_override replaces stage probability
  // Same deal at 'inquiry' (default 10%), once with override=0.75 and once without.
  it('probability_override replaces stage default probability', () => {
    const weeklyHours = 40 * (7 / 14)

    const withOverride = calcWeeklyUtilization(
      makeInput({
        startDate: new Date(Date.UTC(2025, 6, 7)),
        endDate: new Date(Date.UTC(2025, 6, 7)),
        deals: [makeDeal({ current_stage: 'inquiry', probability_override: 0.75 })],
      }),
    )
    const withoutOverride = calcWeeklyUtilization(
      makeInput({
        startDate: new Date(Date.UTC(2025, 6, 7)),
        endDate: new Date(Date.UTC(2025, 6, 7)),
        deals: [makeDeal({ current_stage: 'inquiry', probability_override: null })],
      }),
    )

    expect(withOverride[0].pipelineHours).toBeCloseTo(weeklyHours * 0.75, 4)
    expect(withoutOverride[0].pipelineHours).toBeCloseTo(weeklyHours * 0.10, 4)
  })

  // Scenario 5: capacity_exceptions override default for a specific week
  // Week 1 uses the default (40 h); week 2 has a vacation exception (4 h).
  it('capacity_exception overrides default_weekly_hours for specific week', () => {
    const exception: CapacityException = {
      id: 'exc-1',
      user_id: 'user-1',
      week_start: '2025-07-14',
      available_hours: 4,
      reason: 'vacation',
      created_at: '2025-01-01T00:00:00Z',
    }
    const input = makeInput({
      defaultWeeklyHours: 40,
      capacityExceptions: [exception],
      startDate: new Date(Date.UTC(2025, 6, 7)),
      endDate: new Date(Date.UTC(2025, 6, 14)),
    })
    const result = calcWeeklyUtilization(input)

    expect(result).toHaveLength(2)
    expect(result[0].weekStart).toBe('2025-07-07')
    expect(result[0].capacity).toBe(40)
    expect(result[1].weekStart).toBe('2025-07-14')
    expect(result[1].capacity).toBe(4)
  })

  // works_friday מוסיף 4 שעות קיבולת לכל שבוע רגיל — יום שישי חצי-יום.
  it('worksFriday מוסיף 4 שעות לקיבולת השבועית', () => {
    const withFriday = calcWeeklyUtilization(
      makeInput({ defaultWeeklyHours: 40, worksFriday: true }),
    )
    const withoutFriday = calcWeeklyUtilization(
      makeInput({ defaultWeeklyHours: 40, worksFriday: false }),
    )

    expect(withFriday[0].capacity).toBe(44)
    expect(withoutFriday[0].capacity).toBe(40)
  })

  // capacity_exception הוא המספר המדויק שהמשתמש קבע לאותו שבוע — לא מתווסף
  // עליו עוד 4 שעות, גם אם worksFriday דלוק.
  it('capacity_exception גובר על worksFriday — לא מצטבר איתו', () => {
    const exception: CapacityException = {
      id: 'exc-1',
      user_id: 'user-1',
      week_start: '2025-07-07',
      available_hours: 4,
      reason: 'vacation',
      created_at: '2025-01-01T00:00:00Z',
    }
    const result = calcWeeklyUtilization(
      makeInput({ defaultWeeklyHours: 40, worksFriday: true, capacityExceptions: [exception] }),
    )

    expect(result[0].capacity).toBe(4)
  })

  // Retainer contributes monthly_hours / 4.33 to every active week
  it('active retainer contributes monthly_hours / 4.33 per week', () => {
    const retainer: Retainer = {
      id: 'ret-1',
      user_id: 'user-1',
      client_id: 'client-1',
      source_deal_id: null,
      name: 'Retainer',
      monthly_hours: 43.3,
      pricing_type: 'fixed_monthly',
      hourly_rate: null,
      monthly_fixed_price: 5000,
      start_date: '2025-01-01',
      end_date: null,
      status: 'active',
      notes: null,
      created_at: '2025-01-01T00:00:00Z',
    }
    const input = makeInput({
      retainers: [retainer],
      startDate: new Date(Date.UTC(2025, 6, 7)),
      endDate: new Date(Date.UTC(2025, 6, 7)),
    })
    const result = calcWeeklyUtilization(input)

    expect(result).toHaveLength(1)
    expect(result[0].committedHours).toBeCloseTo(43.3 / 4.33, 4) // ≈ 10 h/week
  })

  it('pipeline retainer deal (with end_date) contributes monthly_hours/4.33 × probability per active week', () => {
    const input: UtilizationInput = {
      defaultWeeklyHours: 40, worksFriday: false,
      startDate: new Date('2026-08-03'),
      endDate: new Date('2026-08-09'),
      projects: [], allocations: [], retainers: [], capacityExceptions: [],
      deals: [{
        id: 'd1', user_id: 'u1', client_id: null, name: 'Retainer Deal',
        deal_type: 'retainer',
        monthly_hours: 86.6,   // 86.6/4.33 ≈ 20 שעות לשבוע
        estimated_hours: null,
        pricing_type: 'hourly', hourly_rate: 100, fixed_price: null,
        expected_start_date: '2026-08-01',
        expected_end_date: '2026-08-31',
        current_stage: 'negotiation', // probability 0.55
        probability_override: null,
        status: 'active', created_at: '', closed_at: null,
        notes: null, priority: null, reminder_date: null,
      }],
    }
    const result = calcWeeklyUtilization(input)
    // 86.6 / 4.33 * 0.55 ≈ 11
    expect(result[0].pipelineHours).toBeCloseTo(11, 1)
    expect(result[0].committedHours).toBe(0)
  })

  it('pipeline retainer deal with no end_date contributes to every week until window end', () => {
    const input: UtilizationInput = {
      defaultWeeklyHours: 40, worksFriday: false,
      startDate: new Date('2026-08-03'),
      endDate: new Date('2026-08-16'),   // 2 שבועות
      projects: [], allocations: [], retainers: [], capacityExceptions: [],
      deals: [{
        id: 'd1', user_id: 'u1', client_id: null, name: 'Open Retainer Deal',
        deal_type: 'retainer',
        monthly_hours: 43.3,  // 43.3/4.33 ≈ 10 שעות לשבוע
        estimated_hours: null,
        pricing_type: 'hourly', hourly_rate: 100, fixed_price: null,
        expected_start_date: '2026-08-01',
        expected_end_date: null,          // ריטיינר פתוח
        current_stage: 'contract',        // probability 1.0
        probability_override: null,
        status: 'active', created_at: '', closed_at: null,
        notes: null, priority: null, reminder_date: null,
      }],
    }
    const result = calcWeeklyUtilization(input)
    expect(result).toHaveLength(2)
    // שני השבועות צריכים לקבל ~10 שעות כל אחד
    expect(result[0].pipelineHours).toBeCloseTo(10, 1)
    expect(result[1].pipelineHours).toBeCloseTo(10, 1)
  })

  it('pipeline retainer deal does not contribute before expected_start_date', () => {
    const input: UtilizationInput = {
      defaultWeeklyHours: 40, worksFriday: false,
      startDate: new Date('2026-08-03'),
      endDate: new Date('2026-08-16'),
      projects: [], allocations: [], retainers: [], capacityExceptions: [],
      deals: [{
        id: 'd1', user_id: 'u1', client_id: null, name: 'Future Retainer',
        deal_type: 'retainer',
        monthly_hours: 43.3,
        estimated_hours: null,
        pricing_type: 'hourly', hourly_rate: 100, fixed_price: null,
        expected_start_date: '2026-08-10',  // מתחיל בשבוע השני
        expected_end_date: null,
        current_stage: 'contract',
        probability_override: null,
        status: 'active', created_at: '', closed_at: null,
        notes: null, priority: null, reminder_date: null,
      }],
    }
    const result = calcWeeklyUtilization(input)
    expect(result[0].pipelineHours).toBe(0)          // שבוע 1 — לפני התחלת הדיל
    expect(result[1].pipelineHours).toBeCloseTo(10, 1) // שבוע 2 — תוך כדי
  })

  // priority/notes/reminder_date הם מידע וסינון בלבד — החלטת מוצר מפורשת.
  // הטסט הזה מעגן שהם לא דולפים לחישוב דרך ה-select('*') של fetcher.ts.
  it('priority, notes ו-reminder_date לא משפיעים על התוצאה', () => {
    const allocations: ProjectWeeklyAllocation[] = [
      { id: 'a1', project_id: 'proj-1', week_start: '2025-07-07', allocated_hours: 20 },
      { id: 'a2', project_id: 'proj-1', week_start: '2025-07-14', allocated_hours: 20 },
    ]

    const bare = calcWeeklyUtilization(
      makeInput({ projects: [makeProject()], allocations, deals: [makeDeal()] }),
    )
    const annotated = calcWeeklyUtilization(
      makeInput({
        projects: [makeProject({ priority: 5, notes: 'דחוף מאוד', reminder_date: '2025-07-10' })],
        allocations,
        deals: [makeDeal({ priority: 1, notes: 'לא דחוף', reminder_date: '2025-07-11' })],
      }),
    )

    expect(annotated).toEqual(bare)
    // וגם ההמלצה שנגזרת מהם — calcRecommendation מקבל weeks בלבד
    expect(calcRecommendation(annotated)).toEqual(calcRecommendation(bare))
  })
})
