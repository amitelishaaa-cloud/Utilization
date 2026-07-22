CREATE TABLE public.retainers (
  id                  uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id           uuid             NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  name                text             NOT NULL,
  monthly_hours       numeric(8,2)     NOT NULL CHECK (monthly_hours > 0),
  pricing_type        retainer_pricing NOT NULL,
  hourly_rate         numeric(12,2)             CHECK (hourly_rate > 0),
  monthly_fixed_price numeric(12,2)             CHECK (monthly_fixed_price > 0),
  start_date          date             NOT NULL,
  end_date            date,
  status              retainer_status  NOT NULL DEFAULT 'active',
  created_at          timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT chk_retainer_end_after_start
    CHECK (end_date IS NULL OR end_date >= start_date),

  CONSTRAINT chk_retainer_pricing_fields
    CHECK (
      (pricing_type = 'hourly'        AND hourly_rate IS NOT NULL         AND monthly_fixed_price IS NULL) OR
      (pricing_type = 'fixed_monthly' AND monthly_fixed_price IS NOT NULL AND hourly_rate IS NULL)
    )
);

CREATE INDEX idx_retainers_user_id     ON public.retainers (user_id);
CREATE INDEX idx_retainers_user_status ON public.retainers (user_id, status);
