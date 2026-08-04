---
tags: [calculations, engine, pure-functions]
related: [[Data-Model]], [[Cockpit]], [[Pipeline]], [[Projects]], [[Retainers]]
---

# Utilization Engine

## What it does
מנוע החישוב הטהור של האפליקציה. מקבל נתוני DB גולמיים ומייצר `WeekBreakdown[]` לכל שבוע בטווח, ומהם `RecommendationResult` אחד. אין side-effects, אין קריאות DB — פונקציות טהורות בלבד.

## Key files
- `lib/calculations/types.ts` — types של המנוע
- `lib/calculations/utilization.ts` — חישוב שבועי
- `lib/calculations/recommendations.ts` — לוגיקת המלצות rule-based
- `lib/calculations/fetcher.ts` — שכבת ה-DB המחברת את מנוע הניצול לSupabase
- `lib/calculations/revenue.ts` — חישוב הכנסה חודשי (מנוע טהור)
- `lib/calculations/revenue-fetcher.ts` — שכבת ה-DB המחברת את מנוע ההכנסה לSupabase
- `lib/pipeline-stages.ts` — הסתברויות ברירת מחדל לשלבים (ראה [[Data-Model]])
- `lib/calculations/thresholds.ts` — ספי ניצול (single source of truth): `UTILIZATION_LOW_THRESHOLD` (0.5), `UTILIZATION_HIGH_THRESHOLD` (0.8), `UTILIZATION_SUSTAINED_THRESHOLD` (0.9), `UTILIZATION_OVERLOAD_THRESHOLD` (1.1)

## Key types / exports

**`lib/calculations/types.ts`**
- `WeekBreakdown` — `{ weekStart: string, committedHours, pipelineHours, capacity, utilization }`
- `UtilizationInput` — `{ defaultWeeklyHours, startDate, endDate, projects, allocations, retainers, deals, capacityExceptions }`
- `RecommendationTag` — `'overload' | 'optimal' | 'warning' | 'urgent_gap' | 'mid_gap' | 'far_gap' | 'sustained_high'`
- `RecommendationResult` — `{ tag, color, text, affectedMonthIndex: number|null, affectedMonthUtilization: number|null }`

**`lib/calculations/utilization.ts`**
- `calcWeeklyUtilization(input: UtilizationInput): WeekBreakdown[]` — entry point ראשי
- `parseDate(dateStr: string): Date` — YYYY-MM-DD → Date (UTC)
- `toDateStr(date: Date): string` — Date → YYYY-MM-DD
- `getWeekStart(date: Date): Date` — מחזיר את יום שני של השבוע
- `getWeeksInRange(start, end): Date[]` — רשימת ימי שני בטווח

**`lib/calculations/recommendations.ts`**
- `calcRecommendation(weeks: WeekBreakdown[]): RecommendationResult` — בודק חודשים לפי סדר עדיפות: overload → urgent_gap → mid_gap → far_gap → warning → sustained_high → optimal

**`lib/calculations/fetcher.ts`**
- `fetchUtilization(userId, startDate, endDate): Promise<UtilizationFetchResult>`
- `UtilizationFetchResult` — `{ weeks: WeekBreakdown[], recommendation: RecommendationResult, plan: 'free'|'pro' }`

**`lib/calculations/revenue.ts`**
- `calcMonthlyRevenue(input: RevenueInput): MonthRevenue` — pure calculation of revenue for a calendar month
- `RevenueInput` — `{ monthStart, monthEnd, projects, allocations, retainers, deals }`
- `MonthRevenue` — `{ yearMonth, monthLabel, projectRevenue, retainerRevenue, pipelineRevenue, total, weeks: WeekRevenue[] }`
- `WeekRevenue` — `{ weekStart, monthFraction, projectRevenue, pipelineRevenue, total }` — weekly breakdown (retainers are monthly-level only)

**`lib/calculations/revenue-fetcher.ts`**
- `fetchMonthlyRevenue(userId, today): Promise<MonthRevenue>` — fetch and compute revenue for calendar month
- `getMonthBounds(today): { monthStart, monthEnd }` — calendar month boundaries

## לוגיקת חישוב

```
capacity(week)   = capacity_exceptions.available_hours OR users.default_weekly_hours
committed(week)  = Σ project_weekly_allocations OR (estimated_hours / total_weeks)
                 + Σ retainer.monthly_hours                                        # monthly entities, no division
pipeline(week)   = Σ (deal.estimated_hours / deal_weeks) × stage_probability        # deal_type='project'
                 + Σ deal.monthly_hours × stage_probability                         # deal_type='retainer', monthly semantics
                 # ריטיינר פתוח (no expected_end_date): תורם עד סוף חלון החישוב
utilization      = (committed + pipeline) / capacity

revenue(month)   = Σ project_weekly_revenue × weekly_month_fraction
                 + Σ retainer.monthly_amount                                       # full monthly amount per active month
                 + Σ pipeline_project_revenue × weekly_month_fraction × stage_probability
                 + Σ pipeline_retainer_monthly_amount × stage_probability
```

## לוגיקת המלצות (priority order)

| Tag | תנאי | צבע |
|-----|------|-----|
| `overload` | utilization > 110% בכל חודש (עדיפות עליונה) | red |
| `urgent_gap` | utilization < 50%, חודש 1 | dark_red |
| `mid_gap` | utilization < 50%, חודש 2 | orange |
| `far_gap` | utilization < 50%, חודש 3+ | yellow |
| `warning` | 50%–80%, חודש ראשון שנמצא | yellow |
| `sustained_high` | > 90% ב-2+ חודשים | blue |
| `optimal` | כל השאר | green |

> הספים המספריים מוגדרים ב-`lib/calculations/thresholds.ts` ומיובאים ל-`recommendations.ts` ו-`cockpit-helpers.ts`.

## Dependencies & consumers
- תלוי ב: [[Data-Model]] (types), `lib/pipeline-stages.ts`
- צורך אותו: [[Cockpit]] דרך `fetchUtilization`
- בדיקות: `lib/calculations/__tests__/utilization.test.ts`, `recommendations.test.ts`, `cockpit-helpers.test.ts`
