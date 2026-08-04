import { describe, it, expect } from 'vitest'
import { calcMonthlyRevenue } from '@/lib/calculations/revenue'
import { calcWeeklyUtilization } from '@/lib/calculations/utilization'
import type { RevenueInput } from '@/lib/calculations/revenue'
import type { UtilizationInput } from '@/lib/calculations/types'
import type {
  Project,
  Retainer,
  PipelineDeal,
  ProjectWeeklyAllocation,
} from '@/lib/types'

// ── חודש הבדיקה: אוגוסט 2026 ────────────────────────────────────────────────
//
// 2026-08-01 הוא שבת, 2026-08-31 הוא יום שני. getWeeksInRange מחזיר 6 ימי שני:
//   07-27 (חופף לאוגוסט 2 ימים בלבד → monthFraction 2/7)
//   08-03, 08-10, 08-17, 08-24 (שבועות מלאים → 1)
//   08-31 (חופף יום אחד → 1/7)
// סך החלקים: 2/7 + 4 + 1/7 = 31/7 — בדיוק מספר הימים באוגוסט חלקי 7.

const FIRST_WEEK_FRACTION = 2 / 7
const LAST_WEEK_FRACTION = 1 / 7

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
    start_date: '2026-08-03',
    end_date: '2026-08-30',
    is_end_date_estimated: false,
    status: 'active',
    notes: null,
    priority: null,
    reminder_date: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeRetainer(overrides: Partial<Retainer> = {}): Retainer {
  return {
    id: 'ret-1',
    user_id: 'user-1',
    client_id: 'client-1',
    source_deal_id: null,
    name: 'Test Retainer',
    monthly_hours: 86.6,
    pricing_type: 'hourly',
    hourly_rate: 100,
    monthly_fixed_price: null,
    start_date: '2026-01-01',
    end_date: null,
    status: 'active',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
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
    pricing_type: 'hourly',
    estimated_hours: 40,
    monthly_hours: null,
    hourly_rate: 100,
    fixed_price: null,
    expected_start_date: '2026-08-03',
    expected_end_date: '2026-08-30',
    current_stage: 'negotiation', // 0.55
    probability_override: null,
    status: 'active',
    notes: null,
    priority: null,
    reminder_date: null,
    created_at: '2026-01-01T00:00:00Z',
    closed_at: null,
    ...overrides,
  }
}

function makeInput(overrides: Partial<RevenueInput> = {}): RevenueInput {
  return {
    monthStart: new Date(Date.UTC(2026, 7, 1)),  // 2026-08-01
    monthEnd: new Date(Date.UTC(2026, 7, 31)),   // 2026-08-31
    projects: [],
    allocations: [],
    retainers: [],
    deals: [],
    ...overrides,
  }
}

// ── פרויקטים ────────────────────────────────────────────────────────────────

describe('calcMonthlyRevenue — פרויקטים', () => {
  // שעות ידניות גוברות על הפריסה השווה, בדיוק כמו במנוע הניצול.
  it('פרויקט hourly עם allocations — סכום השעות בפועל × תעריף', () => {
    const allocations: ProjectWeeklyAllocation[] = [
      { id: 'a1', project_id: 'proj-1', week_start: '2026-08-03', allocated_hours: 10 },
      { id: 'a2', project_id: 'proj-1', week_start: '2026-08-10', allocated_hours: 10 },
      { id: 'a3', project_id: 'proj-1', week_start: '2026-08-17', allocated_hours: 5 },
      { id: 'a4', project_id: 'proj-1', week_start: '2026-08-24', allocated_hours: 5 },
    ]
    const result = calcMonthlyRevenue(makeInput({ projects: [makeProject()], allocations }))

    expect(result.total).toBeCloseTo(30 * 100, 4)
  })

  it('פרויקט hourly בלי allocations — פריסה שווה × תעריף', () => {
    const result = calcMonthlyRevenue(makeInput({ projects: [makeProject()] }))

    // 27 ימים → 27/7 שבועות; 4 שבועות מלאים באוגוסט
    const projectWeeks = 27 / 7
    expect(result.total).toBeCloseTo(4 * (40 / projectWeeks) * 100, 4)
  })

  it('פרויקט fixed — מחיר כולל חלקי מספר השבועות בפרויקט', () => {
    const project = makeProject({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 12000,
    })
    const result = calcMonthlyRevenue(makeInput({ projects: [project] }))

    const projectWeeks = 27 / 7
    expect(result.total).toBeCloseTo(4 * (12000 / projectWeeks), 4)
  })

  // הלב של הפריסה השווה: המכנה הוא אורך הפרויקט המלא, לא החלק שבתוך החודש.
  it('פרויקט fixed שחורג מהחודש — המכנה נשאר אורך הפרויקט המלא', () => {
    const project = makeProject({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 8000,
      start_date: '2026-08-17',
      end_date: '2026-10-12', // 56 ימים → בדיוק 8 שבועות
    })
    const result = calcMonthlyRevenue(makeInput({ projects: [project] }))

    // שבועיים מלאים (08-17, 08-24) + 1/7 מהשבוע של 08-31
    const perWeek = 8000 / 8
    expect(result.total).toBeCloseTo(perWeek * (2 + LAST_WEEK_FRACTION), 4)
  })

  it('פרויקט שהסתיים לפני החודש או מתחיל אחריו — 0', () => {
    const before = makeProject({ id: 'p-before', start_date: '2026-06-01', end_date: '2026-07-20' })
    const after = makeProject({ id: 'p-after', start_date: '2026-09-07', end_date: '2026-09-28' })
    const result = calcMonthlyRevenue(makeInput({ projects: [before, after] }))

    expect(result.total).toBe(0)
  })

  it('פרויקט שאינו active — 0', () => {
    const completed = makeProject({ status: 'completed' })
    const cancelled = makeProject({ id: 'p-2', status: 'cancelled' })
    const result = calcMonthlyRevenue(makeInput({ projects: [completed, cancelled] }))

    expect(result.total).toBe(0)
  })

  // chk_end_after_start מתיר end_date === start_date, ואז אורך הפרויקט הוא 0.
  // המנוע הקיים מחזיר Infinity במקרה הזה; כאן זה חייב להיות 0.
  it('פרויקט שבו start_date === end_date — 0, לא Infinity ולא NaN', () => {
    const sameDay = makeProject({ start_date: '2026-08-10', end_date: '2026-08-10' })
    const sameDayFixed = makeProject({
      id: 'p-2',
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 5000,
      start_date: '2026-08-10',
      end_date: '2026-08-10',
    })
    const result = calcMonthlyRevenue(makeInput({ projects: [sameDay, sameDayFixed] }))

    expect(result.total).toBe(0)
    expect(Number.isFinite(result.total)).toBe(true)
  })
})

// ── ריטיינרים ───────────────────────────────────────────────────────────────

// רטיינר הוא ישות חודשית: הוא מחויב פעם בחודש בסכום ידוע, ולכן תורם את
// הסכום החודשי המלא לחודש שבו הוא פעיל — בלי פריסה לשבועות ובלי הקבוע 4.33.
describe('calcMonthlyRevenue — ריטיינרים', () => {
  it('ריטיינר hourly — שעות חודשיות × תעריף, פעם אחת לחודש', () => {
    const result = calcMonthlyRevenue(makeInput({ retainers: [makeRetainer()] }))

    expect(result.total).toBeCloseTo(86.6 * 100, 4)
    expect(result.retainerRevenue).toBeCloseTo(86.6 * 100, 4)
  })

  it('ריטיינר fixed_monthly — המחיר החודשי בדיוק כפי שהוא', () => {
    const retainer = makeRetainer({
      pricing_type: 'fixed_monthly',
      hourly_rate: null,
      monthly_fixed_price: 4330,
    })
    const result = calcMonthlyRevenue(makeInput({ retainers: [retainer] }))

    expect(result.total).toBe(4330)
  })

  // העוגן של ההחלטה: אורך החודש לא משנה את תרומת הרטיינר.
  it('אותו ריטיינר תורם אותו סכום בחודש של 31 ימים ובחודש של 28', () => {
    const retainer = makeRetainer({
      pricing_type: 'fixed_monthly',
      hourly_rate: null,
      monthly_fixed_price: 4330,
    })

    const august = calcMonthlyRevenue(makeInput({ retainers: [retainer] }))
    const february = calcMonthlyRevenue(
      makeInput({
        monthStart: new Date(Date.UTC(2027, 1, 1)),
        monthEnd: new Date(Date.UTC(2027, 1, 28)),
        retainers: [retainer],
      }),
    )

    expect(august.total).toBe(4330)
    expect(february.total).toBe(4330)
  })

  it('רטיינרים מרובים מסתכמים', () => {
    const a = makeRetainer({ id: 'r-a', monthly_hours: 10, hourly_rate: 300 })
    const b = makeRetainer({
      id: 'r-b',
      pricing_type: 'fixed_monthly',
      hourly_rate: null,
      monthly_fixed_price: 5000,
    })
    const result = calcMonthlyRevenue(makeInput({ retainers: [a, b] }))

    expect(result.total).toBeCloseTo(10 * 300 + 5000, 4)
  })

  it('ריטיינר שהסתיים לפני החודש — 0', () => {
    const ended = makeRetainer({ end_date: '2026-06-30' })
    const result = calcMonthlyRevenue(makeInput({ retainers: [ended] }))

    expect(result.total).toBe(0)
  })

  it('ריטיינר שמתחיל אחרי סוף החודש — 0', () => {
    const future = makeRetainer({ start_date: '2026-09-01' })
    const result = calcMonthlyRevenue(makeInput({ retainers: [future] }))

    expect(result.total).toBe(0)
  })

  it('ריטיינר שאינו active — 0', () => {
    const result = calcMonthlyRevenue(
      makeInput({ retainers: [makeRetainer({ status: 'ended' })] }),
    )

    expect(result.total).toBe(0)
  })
})

// ── עסקאות Pipeline ─────────────────────────────────────────────────────────

describe('calcMonthlyRevenue — עסקאות pipeline', () => {
  it('עסקת פרויקט hourly — משוקללת בהסתברות השלב', () => {
    const result = calcMonthlyRevenue(makeInput({ deals: [makeDeal()] }))

    const dealWeeks = 27 / 7
    expect(result.total).toBeCloseTo(4 * (40 / dealWeeks) * 100 * 0.55, 4)
  })

  it('עסקת פרויקט fixed — פריסה שווה משוקללת בהסתברות', () => {
    const deal = makeDeal({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 12000,
    })
    const result = calcMonthlyRevenue(makeInput({ deals: [deal] }))

    const dealWeeks = 27 / 7
    expect(result.total).toBeCloseTo(4 * (12000 / dealWeeks) * 0.55, 4)
  })

  // עסקת ריטיינר היא ישות חודשית בדיוק כמו רטיינר מחויב — הסכום החודשי
  // המלא, משוקלל בהסתברות השלב, בלי פריסה לשבועות.
  it('עסקת ריטיינר hourly — שעות חודשיות × תעריף × הסתברות, פעם אחת לחודש', () => {
    const deal = makeDeal({
      deal_type: 'retainer',
      estimated_hours: null,
      monthly_hours: 86.6,
      expected_start_date: '2026-08-01',
      expected_end_date: null,
      current_stage: 'negotiation', // 0.55
    })
    const result = calcMonthlyRevenue(makeInput({ deals: [deal] }))

    expect(result.total).toBeCloseTo(86.6 * 100 * 0.55, 4)
  })

  // הנחה A1: ב-deal_type='retainer', fixed_price הוא סכום חודשי.
  it('עסקת ריטיינר fixed — fixed_price הוא הסכום החודשי (הנחה A1)', () => {
    const deal = makeDeal({
      deal_type: 'retainer',
      estimated_hours: null,
      monthly_hours: 86.6,
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 4330,
      expected_start_date: '2026-08-01',
      expected_end_date: null,
      current_stage: 'contract', // 1.0
    })
    const result = calcMonthlyRevenue(makeInput({ deals: [deal] }))

    expect(result.total).toBe(4330)
  })

  it('עסקת ריטיינר שהסתיימה לפני החודש — 0', () => {
    const deal = makeDeal({
      deal_type: 'retainer',
      estimated_hours: null,
      monthly_hours: 86.6,
      expected_start_date: '2026-05-01',
      expected_end_date: '2026-07-15',
      current_stage: 'contract',
    })
    const result = calcMonthlyRevenue(makeInput({ deals: [deal] }))

    expect(result.total).toBe(0)
  })

  it('probability_override גובר על הסתברות השלב', () => {
    const dealWeeks = 27 / 7
    const weekly = (40 / dealWeeks) * 100

    const withOverride = calcMonthlyRevenue(
      makeInput({ deals: [makeDeal({ current_stage: 'inquiry', probability_override: 0.75 })] }),
    )
    const withoutOverride = calcMonthlyRevenue(
      makeInput({ deals: [makeDeal({ current_stage: 'inquiry', probability_override: null })] }),
    )

    expect(withOverride.total).toBeCloseTo(4 * weekly * 0.75, 4)
    expect(withoutOverride.total).toBeCloseTo(4 * weekly * 0.10, 4)
  })

  it('כל שלבי ה-pipeline ממופים להסתברויות הקיימות', () => {
    const dealWeeks = 27 / 7
    const weekly = 4 * (40 / dealWeeks) * 100
    const stages = [
      ['inquiry', 0.10],
      ['proposal', 0.30],
      ['negotiation', 0.55],
      ['verbal_close', 0.80],
      ['contract', 1.00],
    ] as const

    for (const [stage, probability] of stages) {
      const result = calcMonthlyRevenue(makeInput({ deals: [makeDeal({ current_stage: stage })] }))
      expect(result.total).toBeCloseTo(weekly * probability, 4)
    }
  })

  it('עסקאות מרובות מסתכמות', () => {
    const dealWeeks = 27 / 7
    const dealA = makeDeal({ id: 'deal-a', estimated_hours: 20, current_stage: 'negotiation' })
    const dealB = makeDeal({ id: 'deal-b', estimated_hours: 30, current_stage: 'proposal' })
    const result = calcMonthlyRevenue(makeInput({ deals: [dealA, dealB] }))

    const expectedA = 4 * (20 / dealWeeks) * 100 * 0.55
    const expectedB = 4 * (30 / dealWeeks) * 100 * 0.30
    expect(result.total).toBeCloseTo(expectedA + expectedB, 4)
  })

  it('עסקה שאינה active — 0', () => {
    const won = makeDeal({ status: 'won' })
    const lost = makeDeal({ id: 'd-2', status: 'lost' })
    const result = calcMonthlyRevenue(makeInput({ deals: [won, lost] }))

    expect(result.total).toBe(0)
  })
})

// ── גבולות החודש הקלנדרי ────────────────────────────────────────────────────

describe('calcMonthlyRevenue — גבולות החודש', () => {
  it('שבוע חוצה-חודש נספר פרו-רטה לפי ימי החפיפה (הנחה A2)', () => {
    const result = calcMonthlyRevenue(makeInput())

    expect(result.weeks).toHaveLength(6)
    expect(result.weeks[0].weekStart).toBe('2026-07-27')
    expect(result.weeks[0].monthFraction).toBeCloseTo(FIRST_WEEK_FRACTION, 6)

    for (const week of result.weeks.slice(1, 5)) {
      expect(week.monthFraction).toBe(1)
    }

    expect(result.weeks[5].weekStart).toBe('2026-08-31')
    expect(result.weeks[5].monthFraction).toBeCloseTo(LAST_WEEK_FRACTION, 6)
  })

  it('סכום חלקי השבועות שווה למספר הימים בחודש חלקי 7', () => {
    const result = calcMonthlyRevenue(makeInput())
    const sum = result.weeks.reduce((acc, w) => acc + w.monthFraction, 0)

    expect(sum).toBeCloseTo(31 / 7, 6)
  })

  it('חודש בלי שום ישות — total 0 ותווית חודש נכונה', () => {
    const result = calcMonthlyRevenue(makeInput())

    expect(result.total).toBe(0)
    expect(result.yearMonth).toBe('2026-08')
    expect(result.monthLabel).toBe('אוגוסט 2026')
  })

  it('פירוק לפי מקור מסתכם ל-total', () => {
    const result = calcMonthlyRevenue(
      makeInput({
        projects: [makeProject()],
        retainers: [makeRetainer()],
        deals: [makeDeal()],
      }),
    )

    expect(result.total).toBeCloseTo(
      result.projectRevenue + result.retainerRevenue + result.pipelineRevenue,
      6,
    )

    // מה שנפרס שבועית (פרויקטים + עסקאות פרויקט) חייב להסתכם מהשבועות
    const weekly = result.weeks.reduce((acc, w) => acc + w.total, 0)
    expect(result.projectRevenue + result.pipelineRevenue).toBeCloseTo(weekly, 6)
  })

  it('פברואר בשנה מעוברת — הטווח מסתיים ב-29 בחודש', () => {
    const result = calcMonthlyRevenue(
      makeInput({
        monthStart: new Date(Date.UTC(2028, 1, 1)),
        monthEnd: new Date(Date.UTC(2028, 1, 29)),
        retainers: [makeRetainer({ pricing_type: 'fixed_monthly', hourly_rate: null, monthly_fixed_price: 4330 })],
      }),
    )

    expect(result.yearMonth).toBe('2028-02')
    expect(result.total).toBe(4330)
  })
})

// ── בידוד ממנוע הניצול ──────────────────────────────────────────────────────

describe('calcMonthlyRevenue — בידוד ממנוע הניצול', () => {
  it('לא משנה את מערכי הקלט שקיבל', () => {
    const projects = [makeProject()]
    const retainers = [makeRetainer()]
    const deals = [makeDeal()]
    const allocations: ProjectWeeklyAllocation[] = [
      { id: 'a1', project_id: 'proj-1', week_start: '2026-08-03', allocated_hours: 10 },
    ]

    const snapshot = structuredClone({ projects, retainers, deals, allocations })
    calcMonthlyRevenue(makeInput({ projects, retainers, deals, allocations }))

    expect({ projects, retainers, deals, allocations }).toEqual(snapshot)
  })

  // הכיוון הוא חד-כיווני: ניצול ← הכנסה. הרצת חישוב ההכנסה לפני או אחרי
  // מנוע הניצול, על אותם נתונים, חייבת להשאיר את פלט המנוע זהה בדיוק.
  it('פלט calcWeeklyUtilization זהה בדיוק עם ובלי הרצת חישוב ההכנסה', () => {
    const projects = [makeProject()]
    const retainers = [makeRetainer()]
    const deals = [makeDeal()]
    const allocations: ProjectWeeklyAllocation[] = [
      { id: 'a1', project_id: 'proj-1', week_start: '2026-08-03', allocated_hours: 10 },
    ]

    const utilizationInput: UtilizationInput = {
      defaultWeeklyHours: 40,
      startDate: new Date(Date.UTC(2026, 7, 3)),
      endDate: new Date(Date.UTC(2026, 7, 31)),
      projects,
      allocations,
      retainers,
      deals,
      capacityExceptions: [],
    }

    const before = calcWeeklyUtilization(utilizationInput)
    calcMonthlyRevenue(makeInput({ projects, retainers, deals, allocations }))
    const after = calcWeeklyUtilization(utilizationInput)

    expect(after).toEqual(before)
  })

  // מקביל לטסט הקיים ב-utilization.test.ts: select('*') מכניס את השדות
  // האלה ל-rows, והם מידע וסינון בלבד — גם בהכנסה.
  it('priority, notes ו-reminder_date לא משפיעים על ההכנסה', () => {
    const bare = calcMonthlyRevenue(
      makeInput({ projects: [makeProject()], deals: [makeDeal()] }),
    )
    const annotated = calcMonthlyRevenue(
      makeInput({
        projects: [makeProject({ priority: 5, notes: 'דחוף מאוד', reminder_date: '2026-08-10' })],
        deals: [makeDeal({ priority: 1, notes: 'לא דחוף', reminder_date: '2026-08-11' })],
      }),
    )

    expect(annotated).toEqual(bare)
  })
})
