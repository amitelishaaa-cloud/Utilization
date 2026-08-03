-- supabase/migrations/20260803000002_notes_priority_reminder.sql
-- notes / priority / reminder_date
-- priority: סולם 1-5, 5 = הגבוה ביותר. מידע וסינון בלבד — לא נכנס למנוע החישוב.
-- reminder_date: עמודה בלבד בשלב זה — אין מנגנון שליחה, אין cron.
-- הכל nullable וללא DEFAULT: שורות קיימות מקבלות NULL, וה-CHECK על NULL מחזיר NULL (לא FALSE).

ALTER TABLE public.projects
  ADD COLUMN notes         text,
  ADD COLUMN priority      smallint CHECK (priority BETWEEN 1 AND 5),
  ADD COLUMN reminder_date date;

ALTER TABLE public.pipeline_deals
  ADD COLUMN notes         text,
  ADD COLUMN priority      smallint CHECK (priority BETWEEN 1 AND 5),
  ADD COLUMN reminder_date date;

-- retainers מקבלת notes בלבד — החלטה מודעת, ראה CLAUDE.md
ALTER TABLE public.retainers
  ADD COLUMN notes text;
