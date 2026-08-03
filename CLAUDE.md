# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Utilization — a freelancer utilization management tool built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Supabase.

## Commands

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build (also runs TypeScript check)
npm run start    # serve the production build
```

There is no lint script configured. TypeScript errors surface during `npm run build`.

## Next.js 16 + Architecture

כשכותבים קוד ב-`app/`, `components/`, או `lib/` — השתמש ב-Skill `nextjs16-guide` לפני הכתיבה. הוא מכיל את ה-breaking changes, מודל ה-rendering, ודפוסי Supabase.

---

## תיאור עסקי

מרכז בקרת ניצול (utilization) לפרילנסרים עצמאים - נותן תמונת מצב של רמת התעסוקה שלהם, כולל תחזית קדימה (לא רק רטרוספקטיבה: קיבולת + פרויקטים מאושרים + pipeline משוקלל לפי הסתברות שלב). מתריע מתי צריך להאיץ שיווק, להאט, או להעלות מחירים - לפני שכבר מאוחר מדי.

## מוסכמת שפה (חשוב מאוד - אל תסטה ממנה)

כל פרומפט שנכתב עבורך (Claude Code), כל הסבר, סיכום PR, ותרחיש בדיקה - חייבים להיות בעברית בלבד. שמות שדות/פונקציות/paths טכניים נשארים באנגלית בתוך הטקסט העברי (זו זהות הקוד, לא תרגום). קוד וקומיטים - נשארים באנגלית כרגיל.

## החלטות ארכיטקטורה ייחודיות לפרויקט

- **דפוס RLS ללא auth בשלב הפיתוח**: משתמשים ב-Service Role Key (server-only, ב-`lib/supabase/server.ts`) שעוקף RLS, יחד עם `DEV_USER_ID` קבוע מ-`.env.local` שנזרם ל-`user_id` בכל Server Action/Function. כשיתווסף auth אמיתי - שורה אחת תוחלף (`process.env.DEV_USER_ID` → `auth.uid()`).
- **טסטים**: לוגיקה טהורה (בלי DB) - כמו מנוע החישוב וההמלצות - תמיד נבדקת ב-Vitest unit tests, לא במסכים זמניים.
- **שפת ההמלצות שיוצאת למשתמש**: "תצפית מצב", לא פקודה (למשל "הניצול צפוי לרדת מתחת ל-X" ולא "העלה מחירים עכשיו").
- **Tailwind classes**: תמיד strings סטטיים (lookup objects למיפוי צבע) - לא בניית class דינמית.
- RTL כבר מוגדר ב-root `<html dir="rtl">` - אין צורך ב-`dir` overrides ברכיבים.

## סטטוס נוכחי

DB schema מלא ומאומת (8 טבלאות, RLS על כולן). 4 מסכי CRUD (לקוחות/פרויקטים/רטיינרים/pipeline deals + stage history). מנוע חישוב (`lib/calculations/utilization.ts` + `recommendations.ts`) עם 7 מצבי המלצה. מסך cockpit מלא (hero metric, גרף 3 חודשים, בלוק המלצה, blur gate ל-free tier). auth אמיתי - עדיין לא התחיל, מתוכנן בסוף.

## נקודות פתוחות שחשוב לזכור

- כפילות ספי צבע (50%/80%/110%) בין `lib/calculations/cockpit-helpers.ts` ל-`recommendations.ts` - טרם אוחדה למקור אמת אחד. אל תניח סנכרון בין השניים אם תיגע באחד מהם.
- `source_deal_id` בטבלת `projects` קיים בסכמה אך לא בשימוש - "עסקה שנסגרת → פרויקט" נדחה במפורש, לא נקבע מתי ייבנה.

## תיעוד מורחב (Vault)

תחת Vault/ נמצא תיעוד ממוקד לפי נושא, בפורמט Obsidian. אל תסתמך על ידע כללי — Vault הוא מקור האמת המעודכן.

**מתי לדלג על Vault לחלוטין:** שאלות על framework/syntax/TypeScript, debugging של שגיאת קומפייל, שינויי config/tooling, או כל משימה שלא נוגעת ב-business logic של הפרויקט.

**ניתוב ישיר** — קרא ישירות את ה-note הרלוונטי, ללא קריאת Index.md תחילה:

| קובץ/תיקייה | Note לקרוא |
|-------------|------------|
| `lib/types.ts`, `lib/supabase/` | `Vault/concepts/Data-Model.md` |
| `lib/calculations/utilization.ts`, `recommendations.ts`, `types.ts` | `Vault/concepts/Utilization-Engine.md` |
| `lib/calculations/cockpit-helpers.ts`, `lib/calculations/fetcher.ts`, `app/(app)/cockpit/` | `Vault/concepts/Cockpit.md` |
| `lib/pipeline-stages.ts`, `app/(app)/pipeline/`, `components/pipeline/` | `Vault/concepts/Pipeline.md` |
| `app/(app)/projects/`, `components/projects/` | `Vault/concepts/Projects.md` |
| `app/(app)/retainers/`, `components/retainers/` | `Vault/concepts/Retainers.md` |
| `app/(app)/clients/`, `components/clients/` | `Vault/concepts/Clients.md` |
| `app/globals.css`, `components/ui/` | `Vault/concepts/UI-Components.md` |

קרא `Vault/Index.md` רק כשהמשימה לא ממפה בבירור לשורה בטבלה. אם המשימה חוצה תחומים — קרא 2-3 notes לכל היותר.
