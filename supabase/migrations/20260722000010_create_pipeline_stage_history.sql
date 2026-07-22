CREATE TABLE public.pipeline_stage_history (
  id         uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    uuid           NOT NULL REFERENCES public.pipeline_deals(id) ON DELETE CASCADE,
  from_stage pipeline_stage,
  to_stage   pipeline_stage NOT NULL,
  changed_at timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_history_deal ON public.pipeline_stage_history (deal_id);
CREATE INDEX idx_stage_history_time ON public.pipeline_stage_history (changed_at);
