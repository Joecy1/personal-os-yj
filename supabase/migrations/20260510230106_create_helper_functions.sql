-- PostgreSQL Functions for Computing Rolling Averages and Trend Analysis

-- Function: Calculate rolling average for a dimension over a time window
-- Returns the average value for the specified dimension over the last N days
create or replace function calculate_rolling_average(
  p_user_id uuid,
  p_dimension text,
  p_window_days integer,
  p_target_date date default current_date
)
returns numeric as $$
declare
  v_result numeric;
begin
  select avg((data_obj->>p_dimension)::numeric)
  into v_result
  from (
    select jsonb_build_object(
      'positive_emotion', positive_emotion,
      'engagement', engagement,
      'relationships', relationships,
      'meaning', meaning,
      'achievement', achievement,
      'physical_health', physical_health,
      'positive_mindset', positive_mindset,
      'environment', environment,
      'economic_security', economic_security
    ) as data_obj
    from public.perma_entries
    where user_id = p_user_id
    and date between (p_target_date - (p_window_days - 1)::integer) and p_target_date
  ) t;
  
  return coalesce(v_result, 0);
end;
$$ language plpgsql stable;

-- Function: Calculate trend direction (percentage change between two periods)
-- Compares recent average vs. older average to show direction and magnitude
create or replace function calculate_trend_direction(
  p_user_id uuid,
  p_dimension text,
  p_recent_days integer default 30,
  p_prior_days integer default 90,
  p_target_date date default current_date
)
returns numeric as $$
declare
  v_recent_avg numeric;
  v_prior_avg numeric;
  v_trend numeric;
begin
  -- Get recent average (last 30 days)
  v_recent_avg := calculate_rolling_average(p_user_id, p_dimension, p_recent_days, p_target_date);
  
  -- Get prior average (days 30-90)
  select avg((data_obj->>p_dimension)::numeric)
  into v_prior_avg
  from (
    select jsonb_build_object(
      'positive_emotion', positive_emotion,
      'engagement', engagement,
      'relationships', relationships,
      'meaning', meaning,
      'achievement', achievement,
      'physical_health', physical_health,
      'positive_mindset', positive_mindset,
      'environment', environment,
      'economic_security', economic_security
    ) as data_obj
    from public.perma_entries
    where user_id = p_user_id
    and date between (p_target_date - p_prior_days) and (p_target_date - (p_recent_days + 1))
  ) t;
  
  v_prior_avg := coalesce(v_prior_avg, v_recent_avg);
  
  -- Calculate percentage change
  if v_prior_avg = 0 then
    v_trend := 0;
  else
    v_trend := ((v_recent_avg - v_prior_avg) / v_prior_avg) * 100;
  end if;
  
  return round(v_trend, 2);
end;
$$ language plpgsql stable;

-- Function: Calculate volatility (standard deviation) over a time window
-- Shows how stable or variable a dimension has been
create or replace function calculate_volatility(
  p_user_id uuid,
  p_dimension text,
  p_window_days integer default 14,
  p_target_date date default current_date
)
returns numeric as $$
declare
  v_result numeric;
begin
  select stddev((data_obj->>p_dimension)::numeric)
  into v_result
  from (
    select jsonb_build_object(
      'positive_emotion', positive_emotion,
      'engagement', engagement,
      'relationships', relationships,
      'meaning', meaning,
      'achievement', achievement,
      'physical_health', physical_health,
      'positive_mindset', positive_mindset,
      'environment', environment,
      'economic_security', economic_security
    ) as data_obj
    from public.perma_entries
    where user_id = p_user_id
    and date between (p_target_date - (p_window_days - 1)::integer) and p_target_date
  ) t;
  
  return coalesce(v_result, 0);
end;
$$ language plpgsql stable;

-- Function: Compute momentum (simple linear regression slope)
-- Positive slope = improving, negative = declining
create or replace function calculate_momentum(
  p_user_id uuid,
  p_dimension text,
  p_window_days integer default 14,
  p_target_date date default current_date
)
returns numeric as $$
declare
  v_result numeric;
begin
  with data_points as (
    select 
      extract(epoch from (date - (p_target_date - (p_window_days - 1)::integer))::interval) / 86400 as day_index,
      (data_obj->>p_dimension)::numeric as value
    from (
      select 
        date,
        jsonb_build_object(
          'positive_emotion', positive_emotion,
          'engagement', engagement,
          'relationships', relationships,
          'meaning', meaning,
          'achievement', achievement,
          'physical_health', physical_health,
          'positive_mindset', positive_mindset,
          'environment', environment,
          'economic_security', economic_security
        ) as data_obj
      from public.perma_entries
      where user_id = p_user_id
      and date between (p_target_date - (p_window_days - 1)::integer) and p_target_date
    ) t
  ),
  regression_data as (
    select 
      count(*) as n,
      sum(day_index) as sum_x,
      sum(value) as sum_y,
      sum(day_index * value) as sum_xy,
      sum(day_index * day_index) as sum_x2
    from data_points
  )
  select 
    round(
      (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)::numeric,
      4
    )
  into v_result
  from regression_data
  where (n * sum_x2 - sum_x * sum_x) != 0;
  
  return coalesce(v_result, 0);
end;
$$ language plpgsql stable;

-- Function: Correlate activity frequency with wellbeing change
-- Shows if doing an activity correlates with higher wellbeing
create or replace function correlate_activity_and_wellbeing(
  p_user_id uuid,
  p_activity_type text,
  p_dimension text,
  p_window_days integer default 30,
  p_lag_days integer default 0
)
returns numeric as $$
declare
  v_correlation numeric;
  v_activity_counts numeric[];
  v_wellbeing_values numeric[];
begin
  -- Create arrays of activity counts and wellbeing values for correlation
  with daily_data as (
    select 
      pe.date,
      count(a.id) as activity_count,
      avg((pe_data_obj->>p_dimension)::numeric) as wellbeing_value
    from generate_series(
      current_date - (p_window_days - 1)::integer,
      current_date,
      '1 day'::interval
    ) as days(date)
    left join public.perma_entries pe on pe.user_id = p_user_id and pe.date = days.date::date
    left join public.activities a on a.user_id = p_user_id 
      and a.activity_type = p_activity_type 
      and a.date = (days.date - p_lag_days::integer)::date,
    lateral jsonb_build_object(
      'positive_emotion', coalesce(pe.positive_emotion, 0),
      'engagement', coalesce(pe.engagement, 0),
      'relationships', coalesce(pe.relationships, 0),
      'meaning', coalesce(pe.meaning, 0),
      'achievement', coalesce(pe.achievement, 0),
      'physical_health', coalesce(pe.physical_health, 0),
      'positive_mindset', coalesce(pe.positive_mindset, 0),
      'environment', coalesce(pe.environment, 0),
      'economic_security', coalesce(pe.economic_security, 0)
    ) as pe_data_obj
    group by pe.date
  ),
  stats as (
    select 
      array_agg(activity_count) as acts,
      array_agg(coalesce(wellbeing_value, 0)) as wells,
      count(*) as n,
      avg(activity_count) as mean_acts,
      avg(coalesce(wellbeing_value, 0)) as mean_wells,
      stddev_pop(activity_count) as stddev_acts,
      stddev_pop(coalesce(wellbeing_value, 0)) as stddev_wells
    from daily_data
  )
  select 
    round(
      sum((activity_count - mean_acts) * (coalesce(wellbeing_value, 0) - mean_wells)) / 
      (stddev_acts * stddev_wells * n)::numeric,
      4
    )
  into v_correlation
  from daily_data, stats
  where stddev_acts > 0 and stddev_wells > 0;
  
  return coalesce(v_correlation, 0);
end;
$$ language plpgsql stable;

-- Grant execute permissions to authenticated users
grant execute on function calculate_rolling_average to authenticated;
grant execute on function calculate_trend_direction to authenticated;
grant execute on function calculate_volatility to authenticated;
grant execute on function calculate_momentum to authenticated;
grant execute on function correlate_activity_and_wellbeing to authenticated;
