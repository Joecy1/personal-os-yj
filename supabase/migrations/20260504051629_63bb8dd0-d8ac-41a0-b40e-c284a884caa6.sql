-- pomodoro sessions
CREATE TABLE public.pomodoro_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quest_id uuid,
  campaign_id uuid,
  duration_min integer NOT NULL DEFAULT 25,
  break_min integer NOT NULL DEFAULT 5,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  completed boolean NOT NULL DEFAULT false,
  log text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pom_own_all ON public.pomodoro_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_pomodoro_user_started ON public.pomodoro_sessions(user_id, started_at DESC);

-- motivation entries (replaces desire engine surface)
CREATE TABLE public.motivation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  raw_text text NOT NULL DEFAULT '',
  catalyst text NOT NULL DEFAULT '',
  desire text NOT NULL DEFAULT '',
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  emotion text NOT NULL DEFAULT '',
  reality_check text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.motivation_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY mot_own_all ON public.motivation_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mot_updated_at BEFORE UPDATE ON public.motivation_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- personal map (hybrid hand-drawn map, one row per user)
CREATE TABLE public.personal_map (
  user_id uuid PRIMARY KEY,
  inner_citadel jsonb NOT NULL DEFAULT '{"label":"Inner citadel","lines":["Autotelic","The journey is all there is","Drive & fuel"]}'::jsonb,
  defend_engines jsonb NOT NULL DEFAULT '[]'::jsonb,
  destroy_engines jsonb NOT NULL DEFAULT '[]'::jsonb,
  outputs jsonb NOT NULL DEFAULT '[{"key":"influence","label":"Influence","note":""},{"key":"profit","label":"Profit","note":""},{"key":"impact","label":"Impact","note":""}]'::jsonb,
  free_nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  motto text NOT NULL DEFAULT 'The journey is all there is',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY pmap_own_all ON public.personal_map FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pmap_updated_at BEFORE UPDATE ON public.personal_map FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- campaigns: overall XP + capital boosts on completion
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS xp_value integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS capital_targets jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
