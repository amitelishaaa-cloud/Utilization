-- supabase/migrations/20260803000001_deal_realization.sql
-- מימוש עסקה שנסגרה (won) לפרויקט או לריטיינר

-- 1. קישור ריטיינר לעסקת המקור — זהה לדפוס הקיים ב-projects.source_deal_id
ALTER TABLE public.retainers
  ADD COLUMN source_deal_id uuid REFERENCES public.pipeline_deals(id) ON DELETE SET NULL;

-- 2. מניעת כפילות (פרויקט/ריטיינר כפול מאותה עסקה) + אינדקס לשאילתת "האם מומשה?".
--    partial — רוב השורות הן NULL ואין סיבה שייכנסו לאינדקס.
CREATE UNIQUE INDEX idx_projects_source_deal
  ON public.projects (source_deal_id) WHERE source_deal_id IS NOT NULL;

CREATE UNIQUE INDEX idx_retainers_source_deal
  ON public.retainers (source_deal_id) WHERE source_deal_id IS NOT NULL;
