---
tags: [ui, page, cockpit, dashboard]
related: [[Utilization-Engine]], [[Data-Model]], [[UI-Components]], [[Pipeline]], [[Projects]], [[Retainers]]
---

# Cockpit

## What it does
המסך הראשי של האפליקציה. Server Component שמשיג את נתוני הניצול ל-3 חודשים קדימה ומציג: hero metric (% ניצול של החודש הנוכחי; אם החודש הבא בעומס יתר >110% — שניהם מוצגים זה-לצד-זה באותו גודל עם תווית לכל אחד), עמודות תחזית חודשיות עם breakdown שבועי, ובלוק המלצה. משתמשי free רואים blur על העמודות וההמלצה עם CTA לשדרוג.

## Key files
- `app/(app)/cockpit/page.tsx` — Server Component; קורא `fetchUtilization`, מחלק לcomponents
- `lib/calculations/fetcher.ts` — `fetchUtilization()`: DB → engine → `{ weeks, recommendation, plan }`
- `lib/calculations/cockpit-helpers.ts` — utilities לעיבוד output המנוע ל-UI
- `components/cockpit/hero-metric.tsx` — מציג את ה-% הגדול + תווית חודש
- `components/cockpit/forecast-columns.tsx` — Client Component; עמודות חודשיות + click-to-toggle week breakdown; chevron SVG מסתובב 180° בעת הצגת פירוט (aria-expanded לנגישות); תאריכי שבועות מעוצבים דרך `formatDate()` (DD/MM/YYYY)
- `components/cockpit/recommendation-block.tsx` — תג צבעוני + טקסט המלצה
- `components/cockpit/forecast-blur-gate.tsx` — עוטף עמודות+המלצה; blur לfree + CTA

## Key types / exports

**`lib/calculations/cockpit-helpers.ts`**
- `MonthSummary` — `{ yearMonth, monthLabel, monthIndex, utilization, weeks: WeekBreakdown[] }`
- `HeroMonth` — `{ monthIndex, monthLabel, utilization, nextMonthOverload?: { monthIndex, monthLabel, utilization } }`
- `groupWeeksByMonth(weeks): MonthSummary[]` — ממיין weeks לחודשים, capacity-weighted utilization
- `getHeroMonth(weeks, today?): HeroMonth` — מחזיר את החודש הנוכחי לפי `today` (ברירת מחדל: `new Date()`). `nextMonthOverload` מאוכלס אם החודש הבא חורג מ-`UTILIZATION_OVERLOAD_THRESHOLD` (>110%); אינו תלוי ב-`recommendation`
- `getStartOfCurrentWeek(today?): Date` — יום שני הנוכחי (UTC)
- `addMonths(date, n): Date` — מוסיף n חודשים (UTC)
- `utilizationColorClass(u): string` — Tailwind text color class לפי %
- `utilizationBarColorClass(u): string` — Tailwind bg color class לפי %
- `utilizationColorClass` ו-`utilizationBarColorClass` מסתמכות על ספי ניצול מ-`lib/calculations/thresholds.ts` (ראה [[Utilization-Engine]])

**`lib/calculations/fetcher.ts`**
- `UtilizationFetchResult` — `{ weeks: WeekBreakdown[], recommendation: RecommendationResult, plan: 'free'|'pro' }`
- `fetchUtilization(userId, startDate, endDate): Promise<UtilizationFetchResult>`

## Data flow

```
CockpitPage (Server)
  → fetchUtilization(userId, startDate, endDate)        // fetcher.ts
      → Supabase: users, projects, retainers, deals,
                  capacity_exceptions, allocations
      → calcWeeklyUtilization(input)                    // utilization.ts
      → calcRecommendation(weeks)                       // recommendations.ts
      → return { weeks, recommendation, plan }
  → getHeroMonth(weeks)                                 // cockpit-helpers.ts
  → groupWeeksByMonth(weeks)                            // cockpit-helpers.ts
  → <HeroMetric heroMonth={...} />
  → <ForecastBlurGate plan={plan}>
      <ForecastColumns months={...} />
      <RecommendationBlock recommendation={...} />
    </ForecastBlurGate>
```

## Free-tier gate
`users.plan === 'free'` → `ForecastBlurGate` מציג blur CSS על הילדים + CTA "שדרג לפרו לראות את התחזית המלאה"

## Dependencies & consumers
- תלוי ב: [[Utilization-Engine]], [[Data-Model]], [[UI-Components]]
- מייצג נתונים מ: [[Projects]], [[Retainers]], [[Pipeline]]
