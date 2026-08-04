---
tags: [ui, page, cockpit, dashboard]
related: [[Utilization-Engine]], [[Revenue-Forecast]], [[Data-Model]], [[UI-Components]], [[Pipeline]], [[Projects]], [[Retainers]]
---

# Cockpit

## What it does
המסך הראשי של האפליקציה. Server Component שמשיג את נתוני הניצול ל-3 חודשים קדימה ומציג תחזית ל-4 החודשים הקרובים (בדרך כלל): hero metric (% ניצול של החודש הנוכחי; אם החודש הבא בעומס יתר >110% — שניהם מוצגים זה-לצד-זה באותו גודל עם תווית לכל אחד), עמודות תחזית חודשיות עם breakdown שבועי, ובלוק המלצה. משתמשי free רואים blur על העמודות וההמלצה עם CTA לשדרוג.

## Key files
- `app/(app)/cockpit/page.tsx` — Server Component; קורא `fetchUtilization`, מחלק לcomponents
- `lib/calculations/fetcher.ts` — `fetchUtilization()`: DB → engine → `{ weeks, recommendation, plan }`
- `lib/calculations/cockpit-helpers.ts` — utilities לעיבוד output המנוע ל-UI
- `lib/calculations/revenue-fetcher.ts` — `fetchMonthlyRevenue()`: שליפה עצמאית → `MonthRevenue` (ראה [[Revenue-Forecast]])
- `components/cockpit/hero-metric.tsx` — מציג את ה-% הגדול + תווית חודש; prop `revenue?: ReactNode` מוסיף עמודה נלווית
- `components/cockpit/revenue-metric.tsx` — הכנסה צפויה לחודש הקלנדרי + בלור free tier inline
- `components/cockpit/forecast-columns.tsx` — Client Component; עמודות חודשיות + click-to-toggle week breakdown; chevron SVG מסתובב 180° בעת הצגת פירוט (aria-expanded לנגישות); כל שבוע בפירוט מוצג כטווח **ראשון–חמישי**, חתוך לגבולות החודש הפעיל (`workWeekRange()` + `clipRangeToMonth()` מ-`cockpit-helpers.ts`, ראה למטה) דרך `<DateRange>` (ראה [[UI-Components]]) — **לא** string גולמי, כדי ש-`dir="ltr"` ימנע היפוך bidi בתוך ה-RTL layout
- `components/cockpit/recommendation-block.tsx` — תג צבעוני + טקסט המלצה
- `components/cockpit/forecast-blur-gate.tsx` — עוטף עמודות+המלצה; blur לfree + CTA

## Key types / exports

**`lib/calculations/cockpit-helpers.ts`**
- `MonthSummary` — `{ yearMonth, monthLabel, monthIndex, utilization, weeks: WeekBreakdown[] }`
- `HeroMonth` — `{ monthIndex, monthLabel, utilization, nextMonthOverload?: { monthIndex, monthLabel, utilization } }` — עוטף דאטה לחודש הנוכחי + overload בחודש הבא
- `groupWeeksByMonth(weeks): MonthSummary[]` — ממיין weeks לחודשים, capacity-weighted utilization. **קיבולת ושעות של שבוע גבול נפרסות לפי ימי עבודה** (ראה למטה) — לא מיוחסות במלואן לחודש שמכיל את מפתח יום השני
- `getHeroMonth(weeks, today?): HeroMonth` — מחזיר החודש הנוכחי בפי `today` (ברירת מחדל: `new Date()`). חישוב מבוסס local time (לא UTC). `nextMonthOverload` מאוכלס אם החודש הבא חורג מ-`UTILIZATION_OVERLOAD_THRESHOLD` (>110%)
- `getStartOfCurrentWeek(today?): Date` — יום שני הנוכחי (UTC)
- `addMonths(date, n): Date` — מוסיף n חודשים (UTC)
- `workWeekRange(weekStart): { start, end }` — ראשון–חמישי המקביל למפתח יום שני נתון (תווית תצוגה בלבד)
- `clipRangeToMonth(start, end, yearMonth): { start, end }` — חותך טווח ISO לגבולות חודש קלנדרי; משמש להצגת שבוע גבול תחת חודש בודד
- `utilizationColorClass(u): string` — Tailwind text color class לפי %
- `utilizationBarColorClass(u): string` — Tailwind bg color class לפי %
- `utilizationColorClass` ו-`utilizationBarColorClass` מסתמכות על ספי ניצול מ-`lib/calculations/thresholds.ts` (ראה [[Utilization-Engine]])

**`lib/calculations/fetcher.ts`**
- `UtilizationFetchResult` — `{ weeks: WeekBreakdown[], recommendation: RecommendationResult, plan: 'free'|'pro' }`
- `fetchUtilization(userId, startDate, endDate): Promise<UtilizationFetchResult>`

## Data flow

```
CockpitPage (Server)
  → Promise.all([
      fetchUtilization(userId, startDate, endDate)      // fetcher.ts
        → Supabase: users, projects, retainers, deals,
                    capacity_exceptions, allocations
        → calcWeeklyUtilization(input)                  // utilization.ts
        → calcRecommendation(weeks)                     // recommendations.ts
        → return { weeks, recommendation, plan },
      fetchMonthlyRevenue(userId)                       // revenue-fetcher.ts — עצמאית
        → Supabase: projects, retainers, deals, allocations
        → calcMonthlyRevenue(input)                     // revenue.ts
        → return MonthRevenue,
    ])
  → getHeroMonth(weeks)                                 // cockpit-helpers.ts
  → groupWeeksByMonth(weeks)                            // cockpit-helpers.ts
  → <HeroMetric heroMonth={...}
      revenue={<RevenueMetric revenue={...} plan={plan} />} />
  → <ForecastBlurGate plan={plan}>
      <ForecastColumns months={...} />
      <RecommendationBlock recommendation={...} />
    </ForecastBlurGate>
```

> שני החלונות שונים במכוון: הניצול מהשבוע הנוכחי ו-3 חודשים קדימה, ההכנסה על החודש הקלנדרי המלא. ראה [[Revenue-Forecast]].

## Free-tier gate
`users.plan === 'free'` → `ForecastBlurGate` מציג blur CSS על הילדים + CTA "שדרג לפרו לראות את התחזית המלאה". `RevenueMetric` מיישם בלור inline משלו (בלי CTA כפול) — ראה [[Revenue-Forecast]].

## שבוע העבודה — ראשון–חמישי מול מפתח יום שני

`week_start` השמור (DB, `WeekBreakdown.weekStart`) הוא תמיד יום שני — נורמליזציה טכנית של המנוע (ראה [[Utilization-Engine]]), לא הנחה על ימי עבודה. `workWeekRange()` (ב-`cockpit-helpers.ts`) ממפה זאת לתצוגת שבוע עבודה ישראלי: ראשון (יום לפני ה-Monday השמור) עד חמישי (3 ימים אחריו). זו תווית תצוגה גרידא — לא נוגעת ב-`week_start` עצמו, ב-DB, או בחישוב השבוע עצמו.

**הקיבולת וגם השעות (committed+pipeline) מושפעות — פריסה סימטרית.** `groupWeeksByMonth` משתמש באותה מיפוי 5 ימי-עבודה כדי לפרוס את שבוע הגבול בין שני החודשים שהוא חוצה, פרופורציונלית למספר ימי העבודה של כל צד: `(ימי_עבודה_בחודש / 5) × ערך_השבוע_המלא`, לכל אחד משני הצירים בנפרד. למשל שבוע ששני ימיו הראשונים (ראשון-שני) באוגוסט ושלושת האחרונים (שלישי-רביעי-חמישי) בספטמבר, עם קיבולת 40 ושעות 25: תורם `2/5×40=16` שעות-קיבולת ו-`2/5×25=10` שעות-עבודה לאוגוסט, ו-`3/5×40=24` שעות-קיבולת ו-`3/5×25=15` שעות-עבודה לספטמבר. **פריסה סימטרית היא הכרחית** — לפרוס רק את הקיבולת ולהשאיר את השעות מיוחסות במלואן לצד אחד היה מעוות את האחוז (מכנה קטן בלי מונה תואם בצד אחד, מונה שלם על מכנה מוקטן בצד השני).

**תצוגת השבוע ברשימה — שורה אחת, טווח חתוך.** `MonthSummary.weeks` (חברות השבוע לרשימה שנפתחת בלחיצה על עמודת חודש) **לא מתפצלת** — כל שבוע עדיין מופיע כשורה אחת, תחת החודש שמכיל את מפתח יום השני שלו בלבד. אבל **טווח התאריכים המוצג באותה שורה חתוך** ל-`clipRangeToMonth()`: שבוע הגבול לדוגמה מוצג "30/08–31/08" תחת אוגוסט (לא "30/08–03/09"), ו"01/09–03/09" תחת ספטמבר, אילו היה מופיע שם. **האחוז המוצג נשאר `week.utilization` הגולמי, ללא שינוי** — כי היחס בין שעות לקיבולת של אותו שבוע לא משתנה כשגוזרים חלק ממנו (מונה ומכנה מתכווצים באותו יחס). מעוגן ב-`lib/calculations/__tests__/cockpit-helpers.test.ts`.

## מסך הגדרות (`/settings`)

`app/(app)/settings/page.tsx` + `components/settings/settings-form.tsx` + `app/(app)/settings/actions.ts` (`updateSettingsAction`). עורך `users.default_weekly_hours` ו-`users.works_friday` — שני השדות שמזינים את `capacity(week)` במנוע הניצול (ראה [[Utilization-Engine]], [[Data-Model]]). לא היה להם UI לפני כן. קישור בניווט ב-`app/(app)/layout.tsx`.

מיגרציה `20260804000001_works_friday.sql` הוסיפה את העמודה `users.works_friday` כ-boolean עם default `false`. **עדיין ממתינה להפעלה ידנית** בSQL Editor של Supabase.

## Dependencies & consumers
- תלוי ב: [[Utilization-Engine]], [[Data-Model]], [[UI-Components]]
- מייצג נתונים מ: [[Projects]], [[Retainers]], [[Pipeline]]
