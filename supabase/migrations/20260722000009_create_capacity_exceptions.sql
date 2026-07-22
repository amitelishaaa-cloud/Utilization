CREATE TABLE public.capacity_exceptions (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start      date         NOT NULL CHECK (EXTRACT(DOW FROM week_start) = 1),
  available_hours numeric(8,2) NOT NULL CHECK (available_hours >= 0),
  reason          text,
  created_at      timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (user_id, week_start)
);

CREATE INDEX idx_cap_exc_user_week ON public.capacity_exceptions (user_id, week_start);
