CREATE TABLE public.pipeline_deals (
  id                   uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id            uuid                    REFERENCES public.clients(id) ON DELETE SET NULL,
  name                 text           NOT NULL,
  pricing_type         pricing_type   NOT NULL,
  estimated_hours      numeric(8,2)   NOT NULL CHECK (estimated_hours > 0),
  hourly_rate          numeric(12,2)           CHECK (hourly_rate > 0),
  fixed_price          numeric(12,2)           CHECK (fixed_price > 0),
  expected_start_date  date           NOT NULL,
  expected_end_date    date           NOT NULL,
  current_stage        pipeline_stage NOT NULL,
  probability_override numeric(5,4)            CHECK (probability_override >= 0 AND probability_override <= 1),
  status               deal_status    NOT NULL DEFAULT 'active',
  created_at           timestamptz    NOT NULL DEFAULT now(),
  closed_at            timestamptz,

  CONSTRAINT chk_deal_end_after_start
    CHECK (expected_end_date >= expected_start_date),

  CONSTRAINT chk_deal_pricing_fields
    CHECK (
      (pricing_type = 'hourly' AND hourly_rate IS NOT NULL AND fixed_price IS NULL) OR
      (pricing_type = 'fixed'  AND fixed_price IS NOT NULL AND hourly_rate IS NULL)
    ),

  CONSTRAINT chk_closed_at_on_close
    CHECK (
      (status = 'active'           AND closed_at IS NULL) OR
      (status IN ('won', 'lost')   AND closed_at IS NOT NULL)
    )
);

CREATE INDEX idx_deals_user_id     ON public.pipeline_deals (user_id);
CREATE INDEX idx_deals_user_status ON public.pipeline_deals (user_id, status);
CREATE INDEX idx_deals_dates       ON public.pipeline_deals (expected_start_date, expected_end_date);
