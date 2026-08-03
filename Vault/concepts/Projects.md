---
tags: [projects, committed-work, crud]
related: [[Data-Model]], [[Clients]], [[Utilization-Engine]], [[Pipeline]], [[Cockpit]]
---

# Projects

## What it does
ניהול פרויקטים מחויבים — עבודה חד-פעמית שנחתמה. פרויקטים תורמים לשעות `committed` בחישוב הניצול. ניתן לפרוס שעות לשבועות ידנית דרך `project_weekly_allocations`, אחרת המערכת מחלקת שווה בשווה.

## Key files
- `app/(app)/projects/page.tsx` — רשימת פרויקטים
- `app/(app)/projects/new/page.tsx` — טופס פרויקט חדש
- `app/(app)/projects/[id]/edit/page.tsx` — עריכת פרויקט
- `app/(app)/projects/actions.ts` — Server Actions: create, update, delete
- `components/projects/project-form.tsx` — טופס פרויקט (pricing fields, תאריכים); `useState` עוקב `startDate` לשם validation UI ללא end_date קודם ל-start_date
- `components/projects/projects-table.tsx` — טבלת פרויקטים עם סטטוס + לקוח; משתמש ב-`formatDate()` לפורמט start/end dates

## Key types / exports

**מ-`lib/types.ts`** (ראה [[Data-Model]])
- `Project` — הישות המרכזית; שים לב ל-`source_deal_id` — פרויקטים שנפתחו מ-[[Pipeline]] deal
  - ⚠️ הטיפוס מצהיר גם על `notes` ו-`priority`, אבל **העמודות האלה לא קיימות ב-DB** ולא נכתבות/נקראות באף מקום. אל תכניס אותן ל-insert.
- `ProjectWeeklyAllocation` — `{ project_id, week_start, allocated_hours }`
- `ProjectStatus` — `'active' | 'completed' | 'cancelled'`
- `PricingType` — `'hourly' | 'fixed'`

## לוגיקת שעות בשבוע

```
אם קיים project_weekly_allocations לשבוע:
  → השתמש ב-allocated_hours

אחרת:
  → estimated_hours / (end_date - start_date בשבועות)
```

`end_date` הוא **חובה** לכל פרויקט (ניתן לסמן כהערכה דרך `is_end_date_estimated`).

## Dependencies & consumers
- תלוי ב: [[Data-Model]], [[Clients]]
- משפיע על: [[Utilization-Engine]] — `committedHours` לכל שבוע
- פרויקטים נוצרים גם מ-[[Pipeline]] deal שנסגר (won) דרך `realizeDealAction` — `source_deal_id` מקשר חזרה, ועליו partial unique index שמונע פרויקט כפול מאותה עסקה
