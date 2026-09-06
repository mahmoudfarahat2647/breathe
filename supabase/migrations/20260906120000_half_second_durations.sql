-- Widen inhale/hold/exhale/rest duration columns to numeric(3,1) so presets
-- (e.g. Resonance Coherence 5.5/0/5.5/0) can persist half-second durations.
-- Existing integer values round-trip unchanged; new half-step check constraints
-- reject anything not a multiple of 0.5.

alter table public.breathing_settings
  alter column inhale_seconds type numeric(3,1),
  alter column hold_seconds type numeric(3,1),
  alter column exhale_seconds type numeric(3,1),
  alter column rest_seconds type numeric(3,1);

alter table public.breathing_settings
  add constraint breathing_settings_inhale_seconds_half_step_check
    check ((inhale_seconds * 2) = floor(inhale_seconds * 2)),
  add constraint breathing_settings_hold_seconds_half_step_check
    check ((hold_seconds * 2) = floor(hold_seconds * 2)),
  add constraint breathing_settings_exhale_seconds_half_step_check
    check ((exhale_seconds * 2) = floor(exhale_seconds * 2)),
  add constraint breathing_settings_rest_seconds_half_step_check
    check ((rest_seconds * 2) = floor(rest_seconds * 2));

alter table public.breathing_sessions
  alter column inhale_seconds type numeric(3,1),
  alter column hold_seconds type numeric(3,1),
  alter column exhale_seconds type numeric(3,1),
  alter column rest_seconds type numeric(3,1);

alter table public.breathing_sessions
  add constraint breathing_sessions_inhale_seconds_half_step_check
    check ((inhale_seconds * 2) = floor(inhale_seconds * 2)),
  add constraint breathing_sessions_hold_seconds_half_step_check
    check ((hold_seconds * 2) = floor(hold_seconds * 2)),
  add constraint breathing_sessions_exhale_seconds_half_step_check
    check ((exhale_seconds * 2) = floor(exhale_seconds * 2)),
  add constraint breathing_sessions_rest_seconds_half_step_check
    check ((rest_seconds * 2) = floor(rest_seconds * 2));
