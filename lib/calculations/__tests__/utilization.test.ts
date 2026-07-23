import { describe, it, expect } from 'vitest'
import { calcWeeklyUtilization } from '@/lib/calculations/utilization'
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
    pricing_type: 'hourly',
    estimated_hours: 40,
    hourly_rate: 100,
    fixed_price: null,
    expected_start_date: '2025-07-07',
    expected_end_date: '2025-07-20',
    current_stage: 'negotiation',
    probability_override: null,
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    closed_at: null,
    ...overrides,
  }
}

function makeInput(overrides: Partial<UtilizationInput> = {}): UtilizationInput {
  return {
    defaultWeeklyHours: 40,
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

  // Equal-split fallback: when no allocation rows exist, hours are divided by
  // (end_date − start_date).days / 7.  With 21 days and 60 h → exactly 20 h/week.
  it('project without allocations falls back to equal split', () => {
    const project = makeProject({
      estimated_hours: 60,
      start_date: '2025-07-07',
      end_date: '2025-07-28', // 21 days → 3 project-weeks exactly
    })
    const input = makeInput({
      projects: [project],
      allocations: [],
      startDate: new Date(Date.UTC(2025, 6, 7)),
      endDate: new Date(Date.UTC(2025, 6, 7)),
    })
    const result = calcWeeklyUtilization(input)

    expect(result).toHaveLength(1)
    expect(result[0].committedHours).toBe(20) // 60 / 3
  })

  // Scenario 2: single pipeline deal at a middle stage
  // deal_weeks = 13/7; weekly_hours = 40 / (13/7); pipeline = weekly_hours × 0.55
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
    const dealWeeks = 13 / 7
    const expectedPipeline = (40 / dealWeeks) * 0.55
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
    const dealWeeks = 13 / 7
    const expectedA = (20 / dealWeeks) * 0.55
    const expectedB = (30 / dealWeeks) * 0.30
    expect(result[0].pipelineHours).toBeCloseTo(expectedA + expectedB, 4)
  })

  // Scenario 4: probability_override replaces stage probability
  // Same deal at 'inquiry' (default 10%), once with override=0.75 and once without.
  it('probability_override replaces stage default probability', () => {
    const dealWeeks = 13 / 7
    const weeklyHours = 40 / dealWeeks

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

  // Retainer contributes monthly_hours / 4.33 to every active week
  it('active retainer contributes monthly_hours / 4.33 per week', () => {
    const retainer: Retainer = {
      id: 'ret-1',
      user_id: 'user-1',
      client_id: 'client-1',
      name: 'Retainer',
      monthly_hours: 43.3,
      pricing_type: 'fixed_monthly',
      hourly_rate: null,
      monthly_fixed_price: 5000,
      start_date: '2025-01-01',
      end_date: null,
      status: 'active',
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
})
