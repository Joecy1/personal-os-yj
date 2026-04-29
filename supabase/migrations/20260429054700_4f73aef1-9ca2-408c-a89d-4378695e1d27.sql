
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own_profile_select" on public.profiles for select using (auth.uid() = id);
create policy "own_profile_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own_profile_update" on public.profiles for update using (auth.uid() = id);

-- philosophy
create table public.philosophy_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  index text not null,
  content text not null,
  type text not null check (type in ('hard','principle','worldview')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.philosophy_entries enable row level security;
create policy "p_own_all" on public.philosophy_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- personal map
create table public.personal_map_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path_type text not null check (path_type in ('influence','profit','impact')),
  description text default '',
  metrics jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, path_type)
);
alter table public.personal_map_paths enable row level security;
create policy "pm_own_all" on public.personal_map_paths for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active','paused','complete')),
  win_condition text default '',
  tags text[] not null default '{}',
  milestones jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
create policy "c_own_all" on public.campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quests
create table public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  type text not null default 'daily' check (type in ('daily','campaign','routine')),
  xp_value integer not null default 50,
  recurrence text not null default 'daily' check (recurrence in ('daily','weekly','once')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.quests enable row level security;
create policy "q_own_all" on public.quests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quest completions
create table public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (quest_id, completed_at)
);
alter table public.quest_completions enable row level security;
create policy "qc_own_all" on public.quest_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- daily reviews
create table public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  focus_intention text default '',
  went_well text default '',
  carry_forward text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.daily_reviews enable row level security;
create policy "dr_own_all" on public.daily_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- perma entries
create table public.perma_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  positive_emotion numeric not null default 5,
  engagement numeric not null default 5,
  relationships numeric not null default 5,
  meaning numeric not null default 5,
  achievement numeric not null default 5,
  physical_health numeric not null default 5,
  positive_mindset numeric not null default 5,
  environment numeric not null default 5,
  economic_security numeric not null default 5,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.perma_entries enable row level security;
create policy "pe_own_all" on public.perma_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- desire cycles
create table public.desire_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  desire text default '',
  trigger text default '',
  desire_type text default '',
  intensity integer default 5,
  time_horizon text default '',
  resource_money text default '',
  resource_time text default '',
  resource_skill text default '',
  resource_network text default '',
  resource_access text default '',
  lacking text default '',
  constraint_type text default '',
  production_output text default '',
  buyer text default '',
  loop_input text default '',
  loop_process text default '',
  loop_output text default '',
  loop_value text default '',
  consume_what text default '',
  produce_what text default '',
  quota text default '',
  reward text default '',
  enforcement text default '',
  expansion_notes text default '',
  scope_solo text default '',
  scope_shared text default '',
  scope_leveraged text default '',
  model_change text default '',
  feedback_satisfaction text default '',
  feedback_notes text default '',
  new_desires_triggered text default '',
  worth_it text default '',
  adjustment_direction text default '',
  diagnosis text default '',
  target_note text default '',
  status text not null default 'active' check (status in ('active','fulfilled','abandoned')),
  current_phase integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.desire_cycles enable row level security;
create policy "dc_own_all" on public.desire_cycles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- design log
create table public.design_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  title text not null,
  body text default '',
  type text not null default 'insight' check (type in ('insight','pattern','rule','decision')),
  created_at timestamptz not null default now()
);
alter table public.design_log_entries enable row level security;
create policy "dl_own_all" on public.design_log_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ecosystem
create table public.ecosystem_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  excerpt text default '',
  entry_type text not null default 'observation',
  tags text[] not null default '{}',
  source_url text,
  image_url text,
  encountered_at date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.ecosystem_entries enable row level security;
create policy "eco_own_all" on public.ecosystem_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- player stats
create table public.player_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  level integer not null default 1,
  xp_total integer not null default 0,
  xp_to_next integer not null default 500,
  streak_current integer not null default 0,
  streak_best integer not null default 0,
  last_completion_date date,
  capital_human integer not null default 50,
  capital_health integer not null default 50,
  capital_financial integer not null default 50,
  capital_social integer not null default 50,
  capital_symbolic integer not null default 50,
  capital_psychological integer not null default 50,
  capital_time_autonomy integer not null default 50,
  updated_at timestamptz not null default now()
);
alter table public.player_stats enable row level security;
create policy "ps_own_all" on public.player_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_philosophy_updated before update on public.philosophy_entries for each row execute function public.set_updated_at();
create trigger trg_pm_updated before update on public.personal_map_paths for each row execute function public.set_updated_at();
create trigger trg_campaigns_updated before update on public.campaigns for each row execute function public.set_updated_at();
create trigger trg_dr_updated before update on public.daily_reviews for each row execute function public.set_updated_at();
create trigger trg_dc_updated before update on public.desire_cycles for each row execute function public.set_updated_at();

-- handle new user: profile + stats + map paths
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name',''));
  insert into public.player_stats (user_id) values (new.id);
  insert into public.personal_map_paths (user_id, path_type, description, metrics) values
    (new.id, 'influence', 'Building reach, credibility, and the ability to shift how others think.', '[{"label":"Reach","value":"—"},{"label":"Publications","value":"—"},{"label":"Talks","value":"—"}]'::jsonb),
    (new.id, 'profit', 'Generating surplus through value creation — services, products, and systems that convert capability into financial capital.', '[{"label":"MRR","value":"—"},{"label":"Clients","value":"—"},{"label":"Runway","value":"—"}]'::jsonb),
    (new.id, 'impact', 'Creating change beyond yourself — contributions to institutions, communities, and systems that outlast individual transactions.', '[{"label":"Projects","value":"—"},{"label":"People reached","value":"—"},{"label":"Legacies","value":"—"}]'::jsonb);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
