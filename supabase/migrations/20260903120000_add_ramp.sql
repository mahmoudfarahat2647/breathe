-- Optional ramp on breathing settings.

alter table public.breathing_settings
  add column ramp text;

alter table public.breathing_settings
  add constraint breathing_settings_ramp_check
    check (ramp is null or ramp in ('wind-down'));
