CREATE TABLE public.esm_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  valence smallint NOT NULL DEFAULT 0,
  arousal smallint NOT NULL DEFAULT 0,
  primary_emotion text NOT NULL DEFAULT 'calm',
  context text NOT NULL DEFAULT '',
  trigger text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.esm_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esm_own_all" ON public.esm_entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_esm_entries_user_captured ON public.esm_entries (user_id, captured_at DESC);