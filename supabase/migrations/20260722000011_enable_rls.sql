-- ─── Enable RLS on all tables ───────────────────────────────────────────────

ALTER TABLE public.users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_deals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_weekly_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retainers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_exceptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stage_history     ENABLE ROW LEVEL SECURITY;


-- ─── users ──────────────────────────────────────────────────────────────────
-- INSERT handled by trigger (SECURITY DEFINER); DELETE cascades from auth.users

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());


-- ─── clients ────────────────────────────────────────────────────────────────

CREATE POLICY "clients_select" ON public.clients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE USING (user_id = auth.uid());


-- ─── pipeline_deals ─────────────────────────────────────────────────────────

CREATE POLICY "deals_select" ON public.pipeline_deals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "deals_insert" ON public.pipeline_deals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "deals_update" ON public.pipeline_deals
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "deals_delete" ON public.pipeline_deals
  FOR DELETE USING (user_id = auth.uid());


-- ─── projects ───────────────────────────────────────────────────────────────

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (user_id = auth.uid());


-- ─── project_weekly_allocations (join through projects) ─────────────────────

CREATE POLICY "pwa_select" ON public.project_weekly_allocations
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "pwa_insert" ON public.project_weekly_allocations
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "pwa_update" ON public.project_weekly_allocations
  FOR UPDATE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "pwa_delete" ON public.project_weekly_allocations
  FOR DELETE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );


-- ─── retainers ──────────────────────────────────────────────────────────────

CREATE POLICY "retainers_select" ON public.retainers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "retainers_insert" ON public.retainers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "retainers_update" ON public.retainers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "retainers_delete" ON public.retainers
  FOR DELETE USING (user_id = auth.uid());


-- ─── capacity_exceptions ────────────────────────────────────────────────────

CREATE POLICY "cap_exc_select" ON public.capacity_exceptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "cap_exc_insert" ON public.capacity_exceptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "cap_exc_update" ON public.capacity_exceptions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "cap_exc_delete" ON public.capacity_exceptions
  FOR DELETE USING (user_id = auth.uid());


-- ─── pipeline_stage_history (join through pipeline_deals, immutable log) ────
-- No UPDATE or DELETE policies — history rows are permanent

CREATE POLICY "history_select" ON public.pipeline_stage_history
  FOR SELECT USING (
    deal_id IN (SELECT id FROM public.pipeline_deals WHERE user_id = auth.uid())
  );

CREATE POLICY "history_insert" ON public.pipeline_stage_history
  FOR INSERT WITH CHECK (
    deal_id IN (SELECT id FROM public.pipeline_deals WHERE user_id = auth.uid())
  );
