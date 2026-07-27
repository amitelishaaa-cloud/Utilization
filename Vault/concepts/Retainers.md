---
tags: [retainers, committed-work, recurring, crud]
related: [[Data-Model]], [[Clients]], [[Utilization-Engine]], [[Cockpit]]
---

# Retainers

## What it does
ניהול התקשרויות חוזרות חודשיות — לקוחות רטיינר שמשלמים סכום קבוע או לפי שעה בכל חודש. כל רטיינר פעיל תורם שעות קבועות לשבוע לחישוב ה-`committed` hours. הנוסחה: `monthly_hours / 4.33`.

## Key files
- `app/(app)/retainers/page.tsx` — רשימת רטיינרים
- `app/(app)/retainers/new/page.tsx` — טופס רטיינר חדש
- `app/(app)/retainers/[id]/edit/page.tsx` — עריכת רטיינר
- `app/(app)/retainers/actions.ts` — Server Actions: create, update, delete
- `components/retainers/retainer-form.tsx` — טופס רטיינר; `useState` עוקב `startDate` לשם validation UI ללא end_date קודם ל-start_date
- `components/retainers/retainers-table.tsx` — טבלת רטיינרים עם סטטוס; משתמש ב-`formatDate()` לפורמט start/end dates

## Key types / exports

**מ-`lib/types.ts`** (ראה [[Data-Model]])
- `Retainer` — הישות המרכזית; `end_date` יכול להיות `null` (רטיינר פתוח)
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
