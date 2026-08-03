---
tags: [retainers, committed-work, recurring, crud]
related: [[Data-Model]], [[Clients]], [[Utilization-Engine]], [[Cockpit]], [[Pipeline]]
---

# Retainers

## What it does
ניהול התקשרויות חוזרות חודשיות — לקוחות רטיינר שמשלמים סכום קבוע או לפי שעה בכל חודש. כל רטיינר פעיל תורם שעות קבועות לשבוע לחישוב ה-`committed` hours. הנוסחה: `monthly_hours / 4.33`.

## Key files
- `app/(app)/retainers/page.tsx` — רשימת רטיינרים
- `app/(app)/retainers/new/page.tsx` — טופס רטיינר חדש
- `app/(app)/retainers/[id]/edit/page.tsx` — עריכת רטיינר
- `app/(app)/retainers/actions.ts` — Server Actions: create, update, delete
- `components/retainers/retainer-form.tsx` — טופס רטיינר; `useState` עוקב `startDate` לשם validation UI ללא end_date קודם ל-start_date. שדה ההערות מגיע מ-`components/ui/meta-fields.tsx` עם `showPriorityAndReminder={false}`
- `components/retainers/retainers-table.tsx` — טבלת רטיינרים עם סטטוס; משתמש ב-`formatDate()` לפורמט start/end dates וב-`NotesIcon` מ-`components/ui/meta-cells.tsx`

## Key types / exports

**מ-`lib/types.ts`** (ראה [[Data-Model]])
- `Retainer` — הישות המרכזית; `end_date` יכול להיות `null` (רטיינר פתוח); `source_deal_id` — עסקת [[Pipeline]] שממנה נוצר הרטיינר (nullable, נוסף במיגרציה `20260803000001` יחד עם partial unique index שמונע כפילות)
  - `notes` — שדה הערות חופשי (מיגרציה `20260803000002`). **ל-retainers אין `priority` ואין `reminder_date`** — א-סימטריה מכוונת מול [[Projects]] ו-[[Pipeline]]. אל תכניס אותם ל-insert. ראה [[Data-Model]].
- `RetainerStatus` — `'active' | 'ended'`
- `RetainerPricingType` — `'hourly' | 'fixed_monthly'`

## לוגיקת שעות בשבוע

```
weekly_contribution = retainer.monthly_hours / 4.33
```

חל לכל שבוע שבין `start_date` לבין `end_date` (או ללא הגבלה אם `end_date = null`).

## Dependencies & consumers
- תלוי ב: [[Data-Model]], [[Clients]]
- משפיע על: [[Utilization-Engine]] — `committedHours` לכל שבוע
- רטיינרים נוצרים גם מעסקת [[Pipeline]] מסוג `retainer` שנסגרה (won) דרך `realizeDealAction`
