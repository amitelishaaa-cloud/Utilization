CREATE TABLE public.users (
  id                   uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                text         NOT NULL UNIQUE,
  default_weekly_hours numeric(8,2) NOT NULL DEFAULT 40 CHECK (default_weekly_hours > 0),
  plan                 plan_type    NOT NULL DEFAULT 'free',
  plan_expires_at      timestamptz,
  created_at           timestamptz  NOT NULL DEFAULT now()
);
