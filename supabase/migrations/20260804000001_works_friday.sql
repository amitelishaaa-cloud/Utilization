-- supabase/migrations/20260804000001_works_friday.sql
-- יום שישי חצי-יום: כשדלוק, מנוע הניצול מוסיף 4 שעות קיבולת לכל שבוע רגיל
-- (capacity_exceptions ממשיכות לגבור — הן המספר המדויק שהמשתמש קבע לשבוע הספציפי).

ALTER TABLE public.users ADD COLUMN works_friday boolean NOT NULL DEFAULT false;
