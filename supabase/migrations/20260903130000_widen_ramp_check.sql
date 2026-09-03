-- Widen the ramp check constraint to admit 'slow-down' (Ramp T3, #35).

alter table public.breathing_settings
  drop constraint if exists breathing_settings_ramp_check;

alter table public.breathing_settings
  add constraint breathing_settings_ramp_check
    check (ramp is null or ramp in ('wind-down', 'slow-down'));
