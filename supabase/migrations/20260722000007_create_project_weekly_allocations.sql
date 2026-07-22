CREATE TABLE public.project_weekly_allocations (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid         NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  week_start      date         NOT NULL CHECK (EXTRACT(DOW FROM week_start) = 1),
  allocated_hours numeric(8,2) NOT NULL CHECK (allocated_hours > 0),

  UNIQUE (project_id, week_start)
);

CREATE INDEX idx_pwa_project_week ON public.project_weekly_allocations (project_id, week_start);
