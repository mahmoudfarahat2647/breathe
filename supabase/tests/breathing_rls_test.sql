begin;
select plan(24);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_sso_user,
  is_anonymous
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'owner@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'other@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false
  );

select ok(
  exists(
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'breathing_sessions'
      and indexdef ilike '%user_id%'
      and indexdef ilike '%created_at%'
      and indexdef ilike '%DESC%'
  ),
  'sessions are indexed by (user_id, created_at desc)'
);

set local role anon;

select throws_ok(
  $$select * from public.breathing_settings$$,
  '42501',
  null,
  'anon cannot read settings'
);

select throws_ok(
  $$insert into public.breathing_settings (user_id, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds)
    values ('11111111-1111-4111-8111-111111111111', 4, 4, 6, 2)$$,
  '42501',
  null,
  'anon cannot insert settings'
);

select throws_ok(
  $$update public.breathing_settings set inhale_seconds = 5$$,
  '42501',
  null,
  'anon cannot update settings'
);

select throws_ok(
  $$select * from public.breathing_sessions$$,
  '42501',
  null,
  'anon cannot read sessions'
);

select throws_ok(
  $$insert into public.breathing_sessions (
      id, user_id, cycle_count, elapsed_seconds, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      1, 14, 4, 4, 6, 2
    )$$,
  '42501',
  null,
  'anon cannot insert sessions'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '11111111-1111-4111-8111-111111111111',
    'role', 'authenticated'
  )::text,
  true
);

select results_eq(
  $$insert into public.breathing_settings (user_id, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds)
    values ('11111111-1111-4111-8111-111111111111', 4, 4, 6, 2)
    returning inhale_seconds$$,
  array[4],
  'the owner creates their own settings'
);

select results_eq(
  $$select inhale_seconds from public.breathing_settings$$,
  array[4],
  'the owner reads their own settings'
);

select results_eq(
  $$update public.breathing_settings
    set inhale_seconds = 7
    where user_id = '11111111-1111-4111-8111-111111111111'
    returning inhale_seconds$$,
  array[7],
  'the owner updates their own settings'
);

select results_eq(
  $$insert into public.breathing_sessions (
      id, user_id, cycle_count, elapsed_seconds, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      2, 28, 4, 4, 6, 2
    )
    returning cycle_count$$,
  array[2],
  'the owner creates their own session snapshot'
);

select results_eq(
  $$select cycle_count from public.breathing_sessions$$,
  array[2],
  'the owner reads their own sessions'
);

select throws_ok(
  $$insert into public.breathing_sessions (
      id, user_id, cycle_count, elapsed_seconds, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '11111111-1111-4111-8111-111111111111',
      0, 1, 4, 4, 6, 2
    )$$,
  '23514',
  null,
  'zero-cycle sessions are rejected by the check constraint'
);

select throws_ok(
  $$insert into public.breathing_settings (user_id, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds)
    values ('11111111-1111-4111-8111-111111111111', 1, 4, 6, 2)$$,
  '23514',
  null,
  'invalid inhale duration is rejected'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '22222222-2222-4222-8222-222222222222',
    'role', 'authenticated'
  )::text,
  true
);

select throws_ok(
  $$insert into public.breathing_settings (user_id, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds)
    values ('11111111-1111-4111-8111-111111111111', 5, 5, 5, 2)$$,
  '42501',
  null,
  'another user cannot create settings for the owner'
);

select is_empty(
  $$select * from public.breathing_settings$$,
  'another user reads no settings'
);

select is_empty(
  $$update public.breathing_settings set inhale_seconds = 15 returning inhale_seconds$$,
  'another user updates no settings'
);

select throws_ok(
  $$insert into public.breathing_sessions (
      id, user_id, cycle_count, elapsed_seconds, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds
    ) values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '11111111-1111-4111-8111-111111111111',
      3, 30, 4, 4, 6, 2
    )$$,
  '42501',
  null,
  'another user cannot create a session for the owner'
);

select is_empty(
  $$select * from public.breathing_sessions$$,
  'another user reads no sessions'
);

select results_eq(
  $$insert into public.breathing_settings (user_id, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds)
    values ('22222222-2222-4222-8222-222222222222', 5, 2, 8, 2)
    returning inhale_seconds$$,
  array[5],
  'another user can create their own settings'
);

select results_eq(
  $$select inhale_seconds from public.breathing_settings$$,
  array[5],
  'another user reads only their own settings'
);

select throws_ok(
  $$update public.breathing_sessions set cycle_count = 99 returning cycle_count$$,
  '42501',
  null,
  'authenticated users cannot update session snapshots'
);

select throws_ok(
  $$delete from public.breathing_sessions returning id$$,
  '42501',
  null,
  'authenticated users cannot delete session snapshots'
);

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '11111111-1111-4111-8111-111111111111',
    'role', 'authenticated'
  )::text,
  true
);

select results_eq(
  $$select inhale_seconds from public.breathing_settings
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  array[7],
  'the denied settings update left the owner row intact'
);

select results_eq(
  $$select cycle_count from public.breathing_sessions
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  array[2],
  'the denied session writes left the owner snapshot intact'
);

select * from finish();
rollback;
