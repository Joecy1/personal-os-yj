ALTER TABLE public.desire_cycles
  ADD COLUMN IF NOT EXISTS ambition_size text DEFAULT '',
  ADD COLUMN IF NOT EXISTS idol_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS idol_why text DEFAULT '',
  ADD COLUMN IF NOT EXISTS idol_traits text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_self_idol boolean NOT NULL DEFAULT false;