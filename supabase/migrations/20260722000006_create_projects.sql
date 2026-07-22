CREATE TABLE public.projects (
  id                    uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id             uuid           NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  source_deal_id        uuid                    REFERENCES public.pipeline_deals(id) ON DELETE SET NULL,
  name                  text           NOT NULL,
  pricing_type          pricing_type   NOT NULL,
  estimated_hours       numeric(8,2)   NOT NULL CHECK (estimated_hours > 0),
  actual_hours          numeric(8,2)            CHECK (actual_hours >= 0),
  hourly_rate           numeric(12,2)           CHECK (hourly_rate > 0),
  fixed_price           numeric(12,2)           CHECK (fixed_price > 0),
  start_date            date           NOT NULL,
  end_date              date           NOT NULL,
  is_end_date_estimated boolean        NOT NULL DEFAULT false,
  status                project_status NOT NULL DEFAULT 'active',
  created_at            timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT chk_end_after_start
    CHECK (end_date >= start_date),

  CONSTRAINT chk_pricing_fields
    CHECK (
      (pricing_type = 'hourly' AND hourly_rate IS NOT NULL AND fixed_price IS NULL) OR
      (pricing_type = 'fixed'  AND fixed_price IS NOT NULL AND hourly_rate IS NULL)
    )
);

CREATE INDEX idx_projects_user_id     ON public.projects (user_id);
CREATE INDEX idx_projects_user_status ON public.projects (user_id, status);
CREATE INDEX idx_projects_dates       ON public.projects (start_date, end_date);
