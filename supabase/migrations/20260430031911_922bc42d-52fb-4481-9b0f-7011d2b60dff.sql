
-- Drop Design Log
DROP TABLE IF EXISTS public.design_log_entries CASCADE;

-- Relations: people
CREATE TABLE public.relation_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  context text DEFAULT '',
  avatar_label text DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.relation_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY rp_own_all ON public.relation_people FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_relation_people BEFORE UPDATE ON public.relation_people FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Relations: interactions
CREATE TABLE public.relation_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.relation_people(id) ON DELETE CASCADE,
  what_happened text NOT NULL DEFAULT '',
  how_i_felt text NOT NULL DEFAULT '',
  valence text NOT NULL DEFAULT 'neutral',
  tags text[] NOT NULL DEFAULT '{}',
  want_to_say text,
  interaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.relation_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ri_own_all ON public.relation_interactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_relation_interactions BEFORE UPDATE ON public.relation_interactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_relation_interactions_person ON public.relation_interactions(person_id);
CREATE INDEX idx_relation_interactions_user_date ON public.relation_interactions(user_id, interaction_date DESC);

-- World maps
CREATE TABLE public.world_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  raw_text text NOT NULL DEFAULT '',
  map_data jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.world_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY wm_own_all ON public.world_maps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_world_maps BEFORE UPDATE ON public.world_maps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- World map comparisons
CREATE TABLE public.world_map_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  initiator_id uuid NOT NULL REFERENCES public.world_maps(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.world_maps(id) ON DELETE CASCADE,
  partner_label text NOT NULL,
  comparison_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.world_map_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY wmc_own_all ON public.world_map_comparisons FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_wmc_initiator ON public.world_map_comparisons(initiator_id);
