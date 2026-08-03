---
tags: [auth, security, rls]
related: [[Data-Model]], [[UI-Components]]
---

# Auth

## What it does
אימות אימייל+סיסמה מול Supabase Auth, ואכיפת בידוד נתונים בין משתמשים. החליף את דפוס `DEV_USER_ID` + Service Role Key ששימש בשלב הפיתוח.

**אין service-role client ואין browser client בפרויקט.** כל שאילתה עוברת דרך anon key ונאכפת ב-RLS.

## שלוש שכבות ההגנה

| שכבה | קובץ | תפקיד |
|------|------|--------|
| 1. רענון + הפניה אופטימית | `proxy.ts` | מרענן את ה-session בכל בקשה, מפנה ל-`/login` אם אין משתמש |
| 2. **הגייט הסמכותי** | `requireUser()` | נקרא ב-`app/(app)/layout.tsx` ובראש כל Server Action |
| 3. אכיפה ב-DB | RLS policies | `user_id = auth.uid()` על כל 8 הטבלאות |

שכבה 2 היא לא כפילות: Server Actions נגישות ב-POST ישיר ו-`proxy.ts` לא מהווה גבול authorization — כך גם התיעוד הרשמי של Next.js 16 מגדיר אותו.

## Key files
- `lib/supabase/server.ts` — `createServerClient()` + `requireUser()`, שתיהן **async**
- `proxy.ts` — בשורש הפרויקט. **לא `middleware.ts`** — Next.js 16 שינה את השם
- `lib/auth/routes.ts` — `isPublicPath()`, נצרך על ידי `proxy.ts`
- `lib/auth/validation.ts` — `validateCredentials()`, `MIN_PASSWORD_LENGTH`
- `app/(auth)/actions.ts` — `signInAction`, `signUpAction`, `signOutAction`
- `app/(auth)/login|signup|forgot-password/page.tsx`
- `components/auth/auth-form.tsx` — טופס משותף ל-login ול-signup
- `supabase/migrations/20260722000003_auth_trigger.sql` — `on_auth_user_created`
- `supabase/migrations/20260722000011_enable_rls.sql` — כל ה-policies

## Key exports

**`lib/supabase/server.ts`**
- `createServerClient()` — async. client קשור ל-cookies עם anon key.
- `requireUser()` — async. מחזיר `User` או מפנה ל-`/login`. **קרא פעם אחת לכל request ושמור בקבוע** — כל קריאה מבצעת `auth.getUser()` ברשת.

**`lib/auth/validation.ts`**
- `MIN_PASSWORD_LENGTH` — 6, תואם לברירת המחדל של Supabase
- `validateCredentials(email, password)` — מחזיר הודעת שגיאה בעברית או `null`

## דפוס לשימוש

```ts
const { id: userId } = await requireUser()
const supabase = await createServerClient()

await supabase.from('clients').select('*').eq('user_id', userId)
```

ה-`.eq('user_id', userId)` נשאר למרות ש-RLS כבר מסננת — שכבת הגנה שנייה שתופסת policy שהוגדרה שגוי.

## מלכודות ידועות

- **הרשמה תלויה בטריגר**: `on_auth_user_created` הוא שיוצר את השורה ב-`public.users`. בלעדיה ה-cockpit וכל ה-FK נשברים.
- **Confirm Email חייב להישאר כבוי** (Authentication → Providers → Email). `signUpAction` מצפה ל-session חוזרת ומחזיר שגיאה מפורשת אם אין.
- **`pipeline_stage_history` נכתבת בלי בדיקת שגיאה** ב-`app/(app)/pipeline/actions.ts`. אם ה-policy שלה תיחסם, הכתיבה תיכשל בשקט וזה יתגלה רק כשהטיימליין ב-`/pipeline/[id]` יופיע ריק.
- **`project_weekly_allocations` נקראת בלבד** — שום קוד לא כותב אליה, ולכן ה-policy שלה לא נבדקת דרך הממשק.
- **איפוס סיסמה לא ממומש** — `/forgot-password` הוא עמוד סטטי בלבד.

## Dependencies & consumers
- תלוי ב: [[Data-Model]] (טבלת `users`, ה-RLS policies)
- צורכים אותו: [[Cockpit]], [[Clients]], [[Projects]], [[Retainers]], [[Pipeline]] — כל אחד קורא `requireUser()`
