-- Optional session goal on breathing settings (both columns null or both set).

alter table public.breathing_settings
  add column goal_type text,
  add column goal_value integer;

alter table public.breathing_settings
  add constraint breathing_settings_goal_type_check
    check (goal_type is null or goal_type in ('minutes', 'cycles'));

alter table public.breathing_settings
  add constraint breathing_settings_goal_value_check
    check (
      goal_value is null
      or (goal_type = 'minutes' and goal_value between 1 and 120)
      or (goal_type = 'cycles' and goal_value between 1 and 100)
    );

alter table public.breathing_settings
  add constraint breathing_settings_goal_pair_check
    check (
      (goal_type is null and goal_value is null)
      or (goal_type is not null and goal_value is not null)
    );
