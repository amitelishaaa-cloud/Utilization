---
tags: [index, navigation]
---

# Utilization — מפת הפרויקט

כלי SaaS לפרילאנסרים בודדים שמספק תחזית ניצול ועסקאות קדימה. ממזג שלוש שכבות: קיבולת זמינה, עבודה מחויבת, ועסקאות בתהליך — ומייצר מסך cockpit אחד עם המלצת פעולה.

**Stack:** Next.js 16 · TypeScript · Supabase (PostgreSQL + Auth) · Tailwind CSS 4 · RTL עברית

## מפת מושגים

| מושג | תיאור |
|------|--------|
| [[Utilization-Engine]] | מנוע החישוב הטהור — `calcWeeklyUtilization`, `calcRecommendation` |
| [[Cockpit]] | מסך ראשי — hero metric, עמודות תחזית, המלצה |
| [[Pipeline]] | עסקאות בתהליך, משוקללות לפי הסתברות שלב |
| [[Projects]] | פרויקטים מחויבים (one-time) |
| [[Retainers]] | התקשרויות חוזרות חודשיות |
| [[Clients]] | ישות לקוח — מקשרת Projects, Retainers, Pipeline |
| [[Data-Model]] | Schema, Supabase, TypeScript types |
| [[Auth]] | התחברות, `proxy.ts`, `requireUser()`, אכיפת RLS |
| [[UI-Components]] | קומפוננטות UI משותפות, Tailwind, layout |

## גודל הפרויקט

- ~50 קבצי קוד ב-`app/`, `components/`, `lib/`
- 8 טבלאות Supabase עם RLS per `user_id`
- Free tier: עד 3 עסקאות pipeline, תחזית מטושטשת · Pro: ₪39/חודש
