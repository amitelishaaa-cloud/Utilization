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
  // רגרסיה: פרויקט שאורכו אינו כפולה שלמה של שבוע חופף ליותר שבועות קלנדריים
  // מ-(end − start)/7. פריסה לפי תעריף שבועי הקצתה 77.59 שעות לפרויקט של 75.
  it('פרויקט שכולו בתוך החודש תורם בדיוק את מלוא ערכו — לא יותר', () => {
    const project = makeProject({
      estimated_hours: 75,
      hourly_rate: 110,
      start_date: '2026-08-01', // שבת — נופל בשבוע שמתחיל 27/07
      end_date: '2026-08-30',
    })
    const result = calcMonthlyRevenue(makeInput({ projects: [project] }))

    expect(result.total).toBeCloseTo(75 * 110, 4)
  })

  it('פרויקט fixed שכולו בתוך החודש תורם בדיוק את המחיר הכולל', () => {
    const project = makeProject({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 1500,
      start_date: '2026-08-03',
      end_date: '2026-08-25',
    })
    const result = calcMonthlyRevenue(makeInput({ projects: [project] }))

    expect(result.total).toBeCloseTo(1500, 6)
  })

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

  it('פרויקט hourly בלי allocations — כל השעות × תעריף כשהפרויקט בתוך החודש', () => {
    const result = calcMonthlyRevenue(makeInput({ projects: [makeProject()] }))

    expect(result.total).toBeCloseTo(40 * 100, 4)
  })

  it('פרויקט fixed — המחיר הכולל כשהפרויקט בתוך החודש', () => {
    const project = makeProject({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 12000,
    })
    const result = calcMonthlyRevenue(makeInput({ projects: [project] }))

    expect(result.total).toBe(12000)
  })

  // הלב של הפריסה: המכנה הוא אורך הפרויקט המלא, המונה הוא ימי החפיפה עם החודש.
  it('פרויקט fixed שחורג מהחודש — פרו-רטה לפי ימי החפיפה', () => {
    const project = makeProject({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 8000,
      start_date: '2026-08-17',
      end_date: '2026-10-12',
    })
    const result = calcMonthlyRevenue(makeInput({ projects: [project] }))

    const projectDays = 15 + 30 + 12 // 17-31/08 + ספטמבר + 1-12/10 = 57
    const daysInAugust = 15         // 17..31 באוגוסט
    expect(result.total).toBeCloseTo(8000 * (daysInAugust / projectDays), 4)
  })

  // פרויקט שנפרס על כמה חודשים חייב להסתכם למחיר המלא, בלי לאבד ובלי לכפול.
  it('סכום התרומות של פרויקט לאורך כל חודשיו שווה בדיוק לערכו', () => {
    const project = makeProject({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 8000,
      start_date: '2026-08-17',
      end_date: '2026-10-12',
    })

    const months: [number, number, number][] = [
      [2026, 7, 31], // אוגוסט
      [2026, 8, 30], // ספטמבר
      [2026, 9, 31], // אוקטובר
    ]
    const sum = months.reduce((acc, [year, monthIdx, lastDay]) => {
      const result = calcMonthlyRevenue(
        makeInput({
          monthStart: new Date(Date.UTC(year, monthIdx, 1)),
          monthEnd: new Date(Date.UTC(year, monthIdx, lastDay)),
          projects: [project],
        }),
      )
      return acc + result.total
    }, 0)

    expect(sum).toBeCloseTo(8000, 6)
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

  // chk_end_after_start מתיר end_date === start_date. בפריסה לפי ימים זה טווח
  // תקין באורך יום אחד — הפרויקט תורם את מלוא ערכו, בלי Infinity.
  it('פרויקט בן יום אחד תורם את מלוא ערכו, לא Infinity ולא NaN', () => {
    const sameDayFixed = makeProject({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 5000,
      start_date: '2026-08-10',
      end_date: '2026-08-10',
    })
    const result = calcMonthlyRevenue(makeInput({ projects: [sameDayFixed] }))

    expect(result.total).toBe(5000)
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

    expect(result.total).toBeCloseTo(40 * 100 * 0.55, 4)
  })

  it('עסקת פרויקט fixed — המחיר הכולל משוקלל בהסתברות', () => {
    const deal = makeDeal({
      pricing_type: 'fixed',
      hourly_rate: null,
      fixed_price: 12000,
    })
    const result = calcMonthlyRevenue(makeInput({ deals: [deal] }))

    expect(result.total).toBeCloseTo(12000 * 0.55, 4)
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
    const value = 40 * 100

    const withOverride = calcMonthlyRevenue(
      makeInput({ deals: [makeDeal({ current_stage: 'inquiry', probability_override: 0.75 })] }),
    )
    const withoutOverride = calcMonthlyRevenue(
      makeInput({ deals: [makeDeal({ current_stage: 'inquiry', probability_override: null })] }),
    )

    expect(withOverride.total).toBeCloseTo(value * 0.75, 4)
    expect(withoutOverride.total).toBeCloseTo(value * 0.10, 4)
  })

  it('כל שלבי ה-pipeline ממופים להסתברויות הקיימות', () => {
    const value = 40 * 100
    const stages = [
      ['inquiry', 0.10],
      ['proposal', 0.30],
      ['negotiation', 0.55],
      ['verbal_close', 0.80],
      ['contract', 1.00],
    ] as const

    for (const [stage, probability] of stages) {
      const result = calcMonthlyRevenue(makeInput({ deals: [makeDeal({ current_stage: stage })] }))
      expect(result.total).toBeCloseTo(value * probability, 4)
    }
  })

  it('עסקאות מרובות מסתכמות', () => {
    const dealA = makeDeal({ id: 'deal-a', estimated_hours: 20, current_stage: 'negotiation' })
    const dealB = makeDeal({ id: 'deal-b', estimated_hours: 30, current_stage: 'proposal' })
    const result = calcMonthlyRevenue(makeInput({ deals: [dealA, dealB] }))

    expect(result.total).toBeCloseTo(20 * 100 * 0.55 + 30 * 100 * 0.30, 4)
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

// ── תרחיש אמיתי ─────────────────────────────────────────────────────────────

// הנתונים בפועל מאוגוסט 2026, מהם התגלה שהפריסה השבועית מנפחת פרויקטים.
// הסכום הנכון אומת ידנית מול חישוב המשתמש: 19,622.10.
describe('calcMonthlyRevenue — תרחיש אמיתי, אוגוסט 2026', () => {
  it('מחזיר 19,622.10 על נתוני החשבון', () => {
    const projects = [
      makeProject({
        id: 'p-1',
        name: 'אוטומציה',
        estimated_hours: 75,
        hourly_rate: 110,
        start_date: '2026-08-01',
        end_date: '2026-08-30',
      }),
      makeProject({
        id: 'p-2',
        name: 'אוטומציה א-ג',
        estimated_hours: 75,
        hourly_rate: 110,
        start_date: '2026-08-01',
        end_date: '2026-08-30',
      }),
      makeProject({
        id: 'p-3',
        name: 'ששש',
        pricing_type: 'fixed',
        hourly_rate: null,
        fixed_price: 1500,
        estimated_hours: 15,
        start_date: '2026-08-03',
        end_date: '2026-08-25',
      }),
    ]
    const retainers = [
      makeRetainer({
        name: 'ניהול חשבוניות',
        monthly_hours: 15,
        hourly_rate: 100,
        start_date: '2026-08-05',
        end_date: null,
      }),
    ]
    const deals = [
      makeDeal({
        name: 'אוטומציה',
        deal_type: 'retainer',
        estimated_hours: null,
        monthly_hours: 11,
        hourly_rate: 111,
        expected_start_date: '2026-08-01',
        expected_end_date: '2026-08-31',
        current_stage: 'inquiry', // 0.10
      }),
    ]

    const result = calcMonthlyRevenue(makeInput({ projects, retainers, deals }))

    expect(result.projectRevenue).toBeCloseTo(75 * 110 + 75 * 110 + 1500, 4)
    expect(result.retainerRevenue).toBeCloseTo(15 * 100, 4)
    expect(result.pipelineRevenue).toBeCloseTo(11 * 111 * 0.1, 4)
    expect(result.total).toBeCloseTo(19622.1, 2)
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
      worksFriday: false,
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
