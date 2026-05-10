-- Function to refresh perma_aggregates for a specific user and date range
-- This should be called nightly or via scheduled job
create or replace function refresh_perma_aggregates(
  p_user_id uuid,
  p_start_date date default (current_date - 365),
  p_end_date date default current_date
)
returns table(aggregates_created integer, aggregates_updated integer) as $$
declare
  v_creates integer := 0;
  v_updates integer := 0;
  v_date date;
  v_window_type text;
  v_dims text[] := array['positive_emotion', 'engagement', 'relationships', 'meaning', 'achievement', 'physical_health', 'positive_mindset', 'environment', 'economic_security'];
  v_dim text;
begin
  -- Loop through each date in range
  for v_date in select generate_series(p_start_date, p_end_date, '1 day'::interval)::date loop
    -- Loop through each window type
    foreach v_window_type in array array['7d', '30d', '90d', '365d'] loop
      declare
        v_window_days integer := case v_window_type
          when '7d' then 7
          when '30d' then 30
          when '90d' then 90
          when '365d' then 365
        end;
        v_agg record;
      begin
        -- Try to update; if no rows affected, insert instead
        update public.perma_aggregates set
          positive_emotion_avg = calculate_rolling_average(p_user_id, 'positive_emotion', v_window_days, v_date),
          engagement_avg = calculate_rolling_average(p_user_id, 'engagement', v_window_days, v_date),
          relationships_avg = calculate_rolling_average(p_user_id, 'relationships', v_window_days, v_date),
          meaning_avg = calculate_rolling_average(p_user_id, 'meaning', v_window_days, v_date),
          achievement_avg = calculate_rolling_average(p_user_id, 'achievement', v_window_days, v_date),
          physical_health_avg = calculate_rolling_average(p_user_id, 'physical_health', v_window_days, v_date),
          positive_mindset_avg = calculate_rolling_average(p_user_id, 'positive_mindset', v_window_days, v_date),
          environment_avg = calculate_rolling_average(p_user_id, 'environment', v_window_days, v_date),
          economic_security_avg = calculate_rolling_average(p_user_id, 'economic_security', v_window_days, v_date),
          positive_emotion_trend = calculate_trend_direction(p_user_id, 'positive_emotion', 30, 90, v_date),
          engagement_trend = calculate_trend_direction(p_user_id, 'engagement', 30, 90, v_date),
          relationships_trend = calculate_trend_direction(p_user_id, 'relationships', 30, 90, v_date),
          meaning_trend = calculate_trend_direction(p_user_id, 'meaning', 30, 90, v_date),
          achievement_trend = calculate_trend_direction(p_user_id, 'achievement', 30, 90, v_date),
          physical_health_trend = calculate_trend_direction(p_user_id, 'physical_health', 30, 90, v_date),
          positive_mindset_trend = calculate_trend_direction(p_user_id, 'positive_mindset', 30, 90, v_date),
          environment_trend = calculate_trend_direction(p_user_id, 'environment', 30, 90, v_date),
          economic_security_trend = calculate_trend_direction(p_user_id, 'economic_security', 30, 90, v_date),
          positive_emotion_volatility = calculate_volatility(p_user_id, 'positive_emotion', 14, v_date),
          engagement_volatility = calculate_volatility(p_user_id, 'engagement', 14, v_date),
          relationships_volatility = calculate_volatility(p_user_id, 'relationships', 14, v_date),
          meaning_volatility = calculate_volatility(p_user_id, 'meaning', 14, v_date),
          achievement_volatility = calculate_volatility(p_user_id, 'achievement', 14, v_date),
          physical_health_volatility = calculate_volatility(p_user_id, 'physical_health', 14, v_date),
          positive_mindset_volatility = calculate_volatility(p_user_id, 'positive_mindset', 14, v_date),
          environment_volatility = calculate_volatility(p_user_id, 'environment', 14, v_date),
          economic_security_volatility = calculate_volatility(p_user_id, 'economic_security', 14, v_date)
        where user_id = p_user_id and date = v_date and window_type = v_window_type;

        if found then
          v_updates := v_updates + 1;
        else
          insert into public.perma_aggregates (
            user_id, date, window_type,
            positive_emotion_avg, engagement_avg, relationships_avg, meaning_avg, achievement_avg,
            physical_health_avg, positive_mindset_avg, environment_avg, economic_security_avg,
            positive_emotion_trend, engagement_trend, relationships_trend, meaning_trend, achievement_trend,
            physical_health_trend, positive_mindset_trend, environment_trend, economic_security_trend,
            positive_emotion_volatility, engagement_volatility, relationships_volatility, meaning_volatility, achievement_volatility,
            physical_health_volatility, positive_mindset_volatility, environment_volatility, economic_security_volatility
          ) values (
            p_user_id, v_date, v_window_type,
            calculate_rolling_average(p_user_id, 'positive_emotion', v_window_days, v_date),
            calculate_rolling_average(p_user_id, 'engagement', v_window_days, v_date),
            calculate_rolling_average(p_user_id, 'relationships', v_window_days, v_date),
            calculate_rolling_average(p_user_id, 'meaning', v_window_days, v_date),
            calculate_rolling_average(p_user_id, 'achievement', v_window_days, v_date),
            calculate_rolling_average(p_user_id, 'physical_health', v_window_days, v_date),
            calculate_rolling_average(p_user_id, 'positive_mindset', v_window_days, v_date),
            calculate_rolling_average(p_user_id, 'environment', v_window_days, v_date),
            calculate_rolling_average(p_user_id, 'economic_security', v_window_days, v_date),
            calculate_trend_direction(p_user_id, 'positive_emotion', 30, 90, v_date),
            calculate_trend_direction(p_user_id, 'engagement', 30, 90, v_date),
            calculate_trend_direction(p_user_id, 'relationships', 30, 90, v_date),
            calculate_trend_direction(p_user_id, 'meaning', 30, 90, v_date),
            calculate_trend_direction(p_user_id, 'achievement', 30, 90, v_date),
            calculate_trend_direction(p_user_id, 'physical_health', 30, 90, v_date),
            calculate_trend_direction(p_user_id, 'positive_mindset', 30, 90, v_date),
            calculate_trend_direction(p_user_id, 'environment', 30, 90, v_date),
            calculate_trend_direction(p_user_id, 'economic_security', 30, 90, v_date),
            calculate_volatility(p_user_id, 'positive_emotion', 14, v_date),
            calculate_volatility(p_user_id, 'engagement', 14, v_date),
            calculate_volatility(p_user_id, 'relationships', 14, v_date),
            calculate_volatility(p_user_id, 'meaning', 14, v_date),
            calculate_volatility(p_user_id, 'achievement', 14, v_date),
            calculate_volatility(p_user_id, 'physical_health', 14, v_date),
            calculate_volatility(p_user_id, 'positive_mindset', 14, v_date),
            calculate_volatility(p_user_id, 'environment', 14, v_date),
            calculate_volatility(p_user_id, 'economic_security', 14, v_date)
          );
          v_creates := v_creates + 1;
        end if;
      end;
    end loop;
  end loop;

  return query select v_creates, v_updates;
end;
$$ language plpgsql;

-- Grant execute to authenticated users
grant execute on function refresh_perma_aggregates to authenticated;

-- Create a trigger function that refreshes aggregates when perma_entries are updated
create or replace function trigger_refresh_aggregates_on_perma_update()
returns trigger as $$
begin
  -- Refresh aggregates for the affected date (and surrounding dates for accuracy)
  perform refresh_perma_aggregates(
    new.user_id,
    new.date - 30,
    new.date + 1
  );
  return new;
end;
$$ language plpgsql;

-- Create trigger on perma_entries insert/update
drop trigger if exists perma_entries_refresh_aggregates_trigger on public.perma_entries;
create trigger perma_entries_refresh_aggregates_trigger
  after insert or update on public.perma_entries
  for each row
  execute function trigger_refresh_aggregates_on_perma_update();
