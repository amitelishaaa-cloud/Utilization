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

שני סוגי מקורות, עם סמנטיקה שונה:

**מקורות עם טווח תאריכים — פריסה לפי ימים**

```
value(project) = pricing_type 'fixed' → fixed_price
                 pricing_type 'hourly' → estimated_hours × hourly_rate

revenue = value × (ימי הישות שבתוך החודש / סך ימי הישות)
```

ימים נספרים **כולל שני הקצוות**. פרויקט בן יום אחד = יום אחד. אם קיימות שורות `project_weekly_allocations` לפרויקט שעתי, הן גוברות: `allocated_hours × hourly_rate × (ימי השבוע שבחודש / 7)`.

עסקאות `deal_type='project'` — אותו חישוב, מוכפל ב-`p = probability_override ?? PIPELINE_STAGES[stage].probability`.

**מקורות חודשיים — הסכום המלא, פעם אחת**

```
retainer = pricing_type 'fixed_monthly' → monthly_fixed_price
           pricing_type 'hourly'        → monthly_hours × hourly_rate

עסקת retainer = אותו סכום × p
```

רטיינר פעיל בחודש תורם את מלוא סכומו. **אין חלוקה ב-4.33 ואין פריסה לשבועות** — אורך החודש לא משנה את הסכום. רטיינר מחויב פעם בחודש בסכום ידוע; זו לא ישות שנפרסת על ציר זמן.

- **אין `capacity`** בחישוב — להכנסה אין מכנה. `capacity_exceptions` ו-`default_weekly_hours` לא נשלפים כלל.
- **סכום התרומות של ישות על פני כל חודשיה שווה בדיוק לערכה** — לא פחות ולא יותר. מעוגן בטסט.

> **למה לא פריסה לפי תעריף שבועי.** הגרסה הראשונה חילקה ב-`(end − start)/7` וכפלה בתעריף שבועי. זה מחזיר פחות שבועות ממספר השבועות הקלנדריים שהישות חופפת להם בכל פעם שאורכה אינו כפולה שלמה של שבוע, וכל שבוע חופף קיבל תעריף מלא. פרויקט של 75 שעות מ-01/08/2026 עד 30/08 קיבל 77.59 שעות — יותר מהפרויקט כולו. אותו באג היה במנוע הניצול ותוקן שם באותו אופן (ראה [[Utilization-Engine]]).

## החלטות מתועדות

**A1 — `fixed_price` בעסקת pipeline מסוג `retainer` הוא סכום חודשי.**
תורם את מלוא הסכום לכל חודש שבו העסקה פעילה, מוכפל בהסתברות. עובד גם כשאין `expected_end_date` (ריטיינר פתוח).
⚠️ תווית הטופס ב-`components/pipeline/deal-form.tsx` אומרת "מחיר כולל" גם כש-`deal_type='retainer'`, בעוד `realize-deal-modal.tsx` קורא לאותו שדה "מחיר לחודש". **התווית בטופס היא השגויה** — תיקון UI פתוח.

**A2 — גבול החודש נחתך לפי ימים.**
מקורות עם טווח תאריכים נספרים רק על ימיהם שבתוך החודש הקלנדרי, כך ששבוע החוצה גבול חודש מתחלק נכון בין שני החודשים. `WeekRevenue.monthFraction` נשמר לצורכי דיווח ולפריסת `allocations`. שונה במכוון מ-`groupWeeksByMonth` ב-[[Cockpit]], שמשייך שבוע שלם לחודש שבו הוא מתחיל — שם זה נדרש לעקביות עם הגרף, כאן ההגדרה היא החודש הקלנדרי.

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
