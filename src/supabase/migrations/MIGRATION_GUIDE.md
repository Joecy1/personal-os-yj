# Phase 1A: Database Schema Migrations Guide

## Overview

This directory contains SQL migration files for setting up the temporal causal analytics database schema. These migrations establish the 4-layer data model (State, Activity, Context, Reflection) with supporting functions and policies.

## Migration Files

### 001_create_activities_table.sql
**Purpose**: Create the Activity Layer table for tracking user interventions and behaviors.

**Creates**:
- `activities` table: Tracks activities (gym, reading, meditation, social, deep work, gaming, therapy, volunteering, doomscrolling, dating, meetings, studying, other)
- Columns: id, user_id, date, time, activity_type, duration_minutes, intensity (1-5), tags, notes
- Indexes: user_id, date, activity_type for fast filtering
- RLS Policies: Users can only see/modify their own activities
- Auto-update trigger: Updates `updated_at` timestamp on modification

### 002_create_daily_context_table.sql
**Purpose**: Create the Context Layer table for capturing daily environmental and physiological metadata.

**Creates**:
- `daily_context` table: One entry per user per day
- Columns: id, user_id, date, sleep_hours, sleep_quality (1-10), stress_level (1-10), energy_level (1-10), location, weather, finances_sentiment, notes
- Indexes: user_id, date for efficient querying
- RLS Policies: Users can only see/modify their own context
- Auto-update trigger: Updates `updated_at` timestamp

### 003_create_activity_context_table.sql
**Purpose**: Create activity-scoped context metadata for capturing conditions during individual activities.

**Creates**:
- `activity_context` table: Optional context data captured inline during activity logging
- Columns: id, activity_id (FK to activities), context_data (jsonb)
- RLS Policies: Users can only see/modify context for their own activities
- Auto-update trigger: Updates `updated_at` timestamp

### 004_create_perma_aggregates_table.sql
**Purpose**: Create pre-computed rolling window aggregates to enable fast time-series queries.

**Creates**:
- `perma_aggregates` table: Pre-computed rolling averages (7d, 30d, 90d, 1y)
- Columns: 
  - Per-dimension rolling averages (e.g., positive_emotion_avg, engagement_avg, ...)
  - Per-dimension trend directions (e.g., positive_emotion_trend, ...)
  - Per-dimension volatility/standard deviations (e.g., positive_emotion_volatility, ...)
- Indexes: user_id, date, window_type for efficient filtering
- RLS Policy: Users cannot directly insert/update/delete; computed server-side only
- One aggregate entry per user per date per window type (allows historical snapshots)

### 005_update_perma_entries_table.sql
**Purpose**: Extend existing perma_entries table with Phase 2 fields and improve timestamp tracking.

**Modifications**:
- Add `reflection_id` column (uuid, nullable) for future Reflection Layer integration
- Add `updated_at` column for tracking modifications
- Create trigger to auto-update `updated_at` on modifications

### 006_create_helper_functions.sql
**Purpose**: Create PostgreSQL functions for computing rolling averages, trends, volatility, and correlations.

**Functions Created**:

1. `calculate_rolling_average(user_id, dimension, window_days, target_date)`
   - Computes the rolling average for a dimension over N days
   - Returns numeric(3,2) = value 0-10
   - Example: Last 30 days average for "positive_emotion"

2. `calculate_trend_direction(user_id, dimension, recent_days, prior_days, target_date)`
   - Compares recent period vs. prior period to show trend direction
   - Returns percentage change (-100 to +100)
   - Example: +12.5 means 12.5% improvement over last 30 days vs. prior 60 days

3. `calculate_volatility(user_id, dimension, window_days, target_date)`
   - Computes standard deviation over N days
   - Returns numeric(3,2) showing stability
   - Higher values = more variable; lower values = more stable

4. `calculate_momentum(user_id, dimension, window_days, target_date)`
   - Linear regression slope over N days
   - Positive = improving trend; Negative = declining trend
   - Returns numeric(4,4) = daily rate of change

5. `correlate_activity_and_wellbeing(user_id, activity_type, dimension, window_days, lag_days)`
   - Pearson correlation between activity frequency and wellbeing dimension
   - Returns correlation coefficient (-1 to +1)
   - Supports lag analysis (e.g., does today's gym session correlate with tomorrow's mood?)

All functions are marked as `stable` (no side effects) and executable by authenticated users.

### 007_create_aggregates_refresh_function.sql
**Purpose**: Create automatic refresh mechanism for perma_aggregates table.

**Creates**:

1. `refresh_perma_aggregates(user_id, start_date, end_date)`
   - Refreshes all aggregates for a user over a date range
   - Called automatically after perma_entries insert/update via trigger
   - Can also be called manually for backfilling or manual refresh
   - Returns (aggregates_created, aggregates_updated)

2. `trigger_refresh_aggregates_on_perma_update()`
   - Trigger function that calls `refresh_perma_aggregates` after perma_entries changes
   - Automatically keeps aggregates in sync with new/updated wellbeing entries

**Trigger**:
- `perma_entries_refresh_aggregates_trigger`: Fires after INSERT or UPDATE on perma_entries
- Refreshes aggregates for affected date ± 30 days to ensure rolling window accuracy

---

## Execution Instructions

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd c:\Users\User\personal-os-yj

# Run migrations
supabase migration up

# Or run specific migration
supabase migration up 001_create_activities_table
```

### Option 2: Manual Execution via Supabase Dashboard

1. Open Supabase Dashboard → SQL Editor
2. Open each .sql file in order (001 → 007)
3. Copy and paste the entire content into SQL Editor
4. Click "RUN" to execute each migration
5. Verify success in console output

**Order matters**: Execute migrations in numerical order (001, 002, 003, ..., 007) because later migrations depend on earlier ones.

### Option 3: Direct SQL Execution

```bash
# Using psql (if you have direct PostgreSQL connection)
psql -U postgres -d your_db < 001_create_activities_table.sql
psql -U postgres -d your_db < 002_create_daily_context_table.sql
# ... continue for all 7 files
```

---

## Verification Checklist

After executing all migrations, verify everything is set up correctly:

### Tables Created ✓
```sql
-- Check that all tables exist
select table_name from information_schema.tables 
where table_schema = 'public' 
and table_name in ('activities', 'daily_context', 'activity_context', 'perma_aggregates');
```

Expected output: 4 rows (activities, daily_context, activity_context, perma_aggregates)

### Functions Created ✓
```sql
-- Check that all functions exist
select routine_name from information_schema.routines 
where routine_schema = 'public' 
and routine_name like 'calculate_%' or routine_name like 'refresh_%';
```

Expected: 6 functions
- calculate_rolling_average
- calculate_trend_direction
- calculate_volatility
- calculate_momentum
- correlate_activity_and_wellbeing
- refresh_perma_aggregates

### RLS Enabled ✓
```sql
-- Verify RLS is enabled on new tables
select tablename, rowsecurity from pg_tables 
where tablename in ('activities', 'daily_context', 'activity_context', 'perma_aggregates');
```

Expected: All should show `rowsecurity = true`

### Triggers Created ✓
```sql
-- Check that triggers exist
select trigger_name, event_manipulation, event_object_table 
from information_schema.triggers 
where trigger_schema = 'public' 
and trigger_name like '%updated_at%' or trigger_name like '%aggregates%';
```

Expected triggers:
- activities_updated_at_trigger
- daily_context_updated_at_trigger
- activity_context_updated_at_trigger
- perma_aggregates_updated_at_trigger
- perma_entries_refresh_aggregates_trigger

---

## Testing the Setup

### Test 1: Insert Activity Data

```sql
-- As authenticated user, insert an activity
insert into public.activities (user_id, date, time, activity_type, duration_minutes, intensity, tags)
values (
  auth.uid(),
  current_date,
  current_time,
  'gym',
  60,
  4,
  array['fitness', 'morning']
);

-- Verify insertion
select * from public.activities where user_id = auth.uid();
```

### Test 2: Insert Daily Context

```sql
-- Insert daily context
insert into public.daily_context (user_id, date, sleep_hours, sleep_quality, stress_level, energy_level)
values (
  auth.uid(),
  current_date,
  8.0,
  8,
  3,
  7
);

-- Verify insertion
select * from public.daily_context where user_id = auth.uid();
```

### Test 3: Test Rolling Average Function

```sql
-- Compute rolling average (assuming perma_entries exist)
select calculate_rolling_average(
  auth.uid(),
  'positive_emotion',
  30
);

-- Should return a numeric value between 0-10
```

### Test 4: Verify Aggregate Refresh Trigger

```sql
-- If a perma_entry is updated, aggregates should auto-refresh
-- Check that perma_aggregates table is populated

select count(*) from public.perma_aggregates 
where user_id = auth.uid();

-- Should have entries (4 window types per aggregated date)
```

---

## RLS Policy Reference

All new tables have Row-Level Security (RLS) enabled:

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| activities | Own user only | Own user only | Own user only | Own user only |
| daily_context | Own user only | Own user only | Own user only | Own user only |
| activity_context | Via activity.user_id | Via activity.user_id | Via activity.user_id | Via activity.user_id |
| perma_aggregates | Own user only | DISABLED | DISABLED | DISABLED |

**Note**: `perma_aggregates` is read-only; aggregates are computed server-side via trigger.

---

## Performance Considerations

1. **Indexes**: All tables have indexes on user_id and date for fast filtering. Queries on these columns should be < 100ms.

2. **Rolling Window Functions**: Functions use window functions and aggregates; performance depends on perma_entries data volume:
   - 1 year of daily data: ~50-100ms per function call
   - 5+ years of data: 200-500ms per function call
   - Consider caching results in `perma_aggregates` table for frequent queries

3. **Trigger Overhead**: Automatic aggregate refresh on each perma_entry update may be expensive. If performance degrades:
   - Disable automatic trigger
   - Implement manual/scheduled refresh (nightly batch job)
   - Use materialized view instead of perma_aggregates table

4. **Correlation Function**: `correlate_activity_and_wellbeing` performs time-series correlation; O(n) complexity:
   - < 100 activities in window: < 50ms
   - > 500 activities in window: 200-500ms
   - Consider client-side computation for real-time dashboard queries

---

## Troubleshooting

### Migration Fails: "Relation Does Not Exist"
- Ensure migrations run in order (001 → 007)
- Check that previous migrations executed successfully

### RLS Policy Errors on Insert
- Verify user is authenticated (auth.uid() is not null)
- Check RLS policies are correctly restricting to user_id = auth.uid()
- Try disabling RLS temporarily to test table creation: `alter table activities disable row level security;`

### Function Not Found Errors
- Verify all 7 migrations executed
- Check function permissions: `grant execute on function calculate_rolling_average to authenticated;`
- Reload database connection

### Aggregates Not Populating
- Check trigger is created: `select * from information_schema.triggers where event_object_table = 'perma_entries';`
- Manually call refresh: `select refresh_perma_aggregates(auth.uid(), current_date - 30, current_date);`
- Check trigger function for errors: `select * from pg_proc where proname = 'trigger_refresh_aggregates_on_perma_update';`

---

## Next Steps (Phase 1B)

After all migrations are complete:

1. **Supabase Type Generation**: Regenerate TypeScript types from Supabase schema
   ```bash
   supabase gen types typescript > lib/supabase.types.ts
   ```

2. **Update `integrations/supabase/types.ts` with new table types**

3. **Proceed to Phase 1B**: Create database views and optimize queries

---

## Support

For issues or questions about these migrations:
- Check Supabase documentation: https://supabase.com/docs/guides/cli/managing-migrations
- Review PostgreSQL documentation for function syntax: https://www.postgresql.org/docs/
- Examine table definitions: `\d activities` in psql
