---
tags: [calculations, engine, pure-functions, revenue]
related: [[Cockpit]], [[Utilization-Engine]], [[Data-Model]], [[Pipeline]], [[Projects]], [[Retainers]]
---

# Revenue Forecast

## What it does
מחשב **הכנסה צפויה לחודש הקלנדרי הנוכחי** — מה-1 בחודש ועד סופו — ומציג אותה כמספר יחיד לצד מדד הניצול בקוקפיט. עונה על "כמה זה שווה", בעוד הניצול עונה על "כמה אני עסוק": אפשר להיות ב-95% ניצול ולהרוויח פחות מחודש קודם אם התמהיל זז לתעריפים נמוכים.

## בידוד ממנוע הניצול — החלטה מפורשת
מערכת חישוב **עצמאית לחלוטין**. אין נגיעה ב-`fetchUtilization`, ב-`calcWeeklyUtilization`, או ב-`calcRecommendation`. הזרימה חד-כיוונית: ניצול ← הכנסה. שום ערך שנגזר כאן לא חוזר למנוע או להמלצות.

`revenue.ts` מייבא מ-`utilization.ts` **עוזרי תאריכים טהורים בלבד** (`parseDate`, `toDateStr`, `getWeekStart`, `getWeeksInRange`) ואינו משנה בהם דבר. הבידוד מעוגן בטסטים 17–19 ב-`revenue.test.ts`.

## שני חלונות זמן שונים — במכוון
| מדד | חלון |
|---|---|
| ניצול | מיום שני של השבוע הנוכחי, 3 חודשים קדימה |
| הכנסה | החודש הקלנדרי המלא, כולל שבועות שכבר חלפו |

לכן התוויות במסך מציינות במפורש "(חודש מלא)" — כדי שהמשתמש לא יניח ששני המספרים מתייחסים לאותו טווח.

## Key files
- `lib/calculations/revenue.ts` — `calcMonthlyRevenue()`, לוגיקה טהורה
- `lib/calculations/revenue-fetcher.ts` — `fetchMonthlyRevenue()`, `getMonthBounds()`
- `components/cockpit/revenue-metric.tsx` — תצוגה + בלור free tier inline
- `lib/utils.ts` — `formatCurrency()`
- בדיקות: `lib/calculations/__tests__/revenue.test.ts`

## Key types / exports
- `RevenueInput` — `{ monthStart, monthEnd, projects, allocations, retainers, deals }`
- `WeekRevenue` — `{ weekStart, monthFraction, projectRevenue, retainerRevenue, pipelineRevenue, total }`
- `MonthRevenue` — `{ yearMonth, monthLabel, total, weeks }`
- `calcMonthlyRevenue(input): MonthRevenue`
- `fetchMonthlyRevenue(userId, today?): Promise<MonthRevenue>`
- `getMonthBounds(today?): { monthStart, monthEnd }`

## לוגיקת חישוב

```
לכל שבוע בטווח [יום שני של השבוע שמכיל את ה-1, יום שני של השבוע שמכיל את היום האחרון]:

  project(week)   = pricing_type 'fixed'  → fixed_price / projectWeeks
                    pricing_type 'hourly' → hoursThisWeek × hourly_rate
                    # hoursThisWeek = project_weekly_allocations OR estimated_hours / projectWeeks

  retainer(week)  = pricing_type 'fixed_monthly' → monthly_fixed_price / 4.33
                    pricing_type 'hourly'        → (monthly_hours / 4.33) × hourly_rate

  pipeline(week)  = deal_type 'project'  → (fixed_price / dealWeeks  |  estimated_hours / dealWeeks × hourly_rate) × p
                    deal_type 'retainer' → (fixed_price / 4.33       |  monthly_hours / 4.33 × hourly_rate)        × p
                    # p = probability_override ?? PIPELINE_STAGES[stage].probability

  total(week)     = (project + retainer + pipeline) × monthFraction

total = Σ total(week)
```

- `projectWeeks` / `dealWeeks` = `(end − start) / 7 ימים` — **אורך הישות המלא**, לא החלק שבתוך החודש. פרויקט של 10 שבועות שרק 4 מהם בחודש תורם `4 × (fixed_price / 10)`.
- **אין `capacity`** בחישוב — להכנסה אין מכנה. `capacity_exceptions` ו-`default_weekly_hours` לא נשלפים כלל.
- **guard חלוקה באפס:** `chk_end_after_start` מתיר `end_date = start_date`. ישות כזו תורמת 0 (המנוע הקיים מחזיר `Infinity` באותו מקרה — לא נוגעים בו, רק לא יורשים אותו).

## החלטות מתועדות

**A1 — `fixed_price` בעסקת pipeline מסוג `retainer` הוא סכום חודשי.**
מחולק ב-4.33 לשבוע, במקביל מדויק ל-`monthly_hours` שמנוע הניצול כבר מחלק ב-4.33 לאותה שורת עסקה. עובד גם כשאין `expected_end_date` (ריטיינר פתוח).
⚠️ תווית הטופס ב-`components/pipeline/deal-form.tsx` אומרת "מחיר כולל" גם כש-`deal_type='retainer'`, בעוד `realize-deal-modal.tsx` קורא לאותו שדה "מחיר לחודש". **התווית בטופס היא השגויה** — תיקון UI פתוח.

**A2 — שבוע שחוצה גבול חודש נספר פרו-רטה לפי ימים.**
`monthFraction = (ימי חפיפה עם החודש) / 7`. סכום החלקים שווה בדיוק למספר הימים בחודש חלקי 7. שונה במכוון מ-`groupWeeksByMonth` ב-[[Cockpit]], שמשייך שבוע שלם לחודש שבו הוא מתחיל — שם זה נדרש לעקביות עם הגרף, כאן המספר עצמאי והגדרתו היא החודש הקלנדרי.

## Data flow

```
CockpitPage (Server)
  → Promise.all([
      fetchUtilization(userId, startDate, endDate),   // ללא שינוי
      fetchMonthlyRevenue(userId),                    // עצמאית
    ])
      → getMonthBounds(today)                         // local time לזיהוי החודש, תאריכי UTC
      → Supabase: projects, retainers, pipeline_deals, allocations
      → calcMonthlyRevenue(input)
  → <HeroMetric revenue={<RevenueMetric revenue={...} plan={plan} />} />
```

`plan` נלקח מהפלט של `fetchUtilization` שכבר מחזיר אותו — אין שאילתת `users` נוספת.

## Free-tier gate
`RevenueMetric` מיישם בלור **inline** (`blur-sm select-none` + `aria-hidden`, עם חלופה ב-`sr-only`) ולא דרך `ForecastBlurGate`. הסיבה: ה-gate ההוא מציב overlay עם כרטיס CTA בגודל מלא, ושני כרטיסי CTA באותו מסך היו רעש — ה-CTA מופיע ממילא מיד מתחת.

## Dependencies & consumers
- תלוי ב: [[Data-Model]] (types), `lib/pipeline-stages.ts`, עוזרי תאריכים מ-[[Utilization-Engine]]
- צורך אותו: [[Cockpit]]
- מקורות נתונים: [[Projects]], [[Retainers]], [[Pipeline]]
