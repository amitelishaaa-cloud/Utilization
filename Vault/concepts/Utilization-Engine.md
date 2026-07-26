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
- `lib/calculations/fetcher.ts` — שכבת ה-DB המחברת את המנוע לSupabase
- `lib/pipeline-stages.ts` — הסתברויות ברירת מחדל לשלבים (ראה [[Data-Model]])

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

## לוגיקת חישוב

```
capacity(week)   = capacity_exceptions.available_hours OR users.default_weekly_hours
committed(week)  = Σ project_weekly_allocations OR (estimated_hours / total_weeks)
                 + Σ retainer.monthly_hours / 4.33
pipeline(week)   = Σ (deal.estimated_hours / deal_weeks) * stage_probability
utilization      = (committed + pipeline) / capacity
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

## Dependencies & consumers
- תלוי ב: [[Data-Model]] (types), `lib/pipeline-stages.ts`
- צורך אותו: [[Cockpit]] דרך `fetchUtilization`
- בדיקות: `lib/calculations/__tests__/utilization.test.ts`, `recommendations.test.ts`, `cockpit-helpers.test.ts`
