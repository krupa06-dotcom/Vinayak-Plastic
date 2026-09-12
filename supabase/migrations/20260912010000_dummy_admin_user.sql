-- ============================================================
-- Dummy admin user for local development
-- ============================================================
-- Purpose: Lets you sign in to the admin panel during development
--          without needing to remember the real password.
--
-- Credentials (change the password and email to whatever you like):
--   email:    admin@vinayakplastics.com
--   password: Admin@123
--
-- Idempotent: if the user already exists its password is reset to
--             the dummy password.
--
-- NOTE: GoTrue expects certain auth.users columns to hold an empty
-- string, NOT NULL. Direct inserts that leave them NULL cause the
-- "Database error querying schema" on sign-in, so we always write
-- them as ''.
-- ------------------------------------------------------------

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'admin@vinayakplastics.com'
  limit 1;

  if v_user_id is null then
    -- Create the user
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new,
      email_change_token_current, email_change,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@vinayakplastics.com',
      crypt('Admin@123', gen_salt('bf')),
      now(),
      '', '', '', '', '',
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    )
    returning id into v_user_id;

    -- And the matching identity so GoTrue recognises it
    -- (email is a generated column here — derived from identity_data)
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    values (
      gen_random_uuid(),
      v_user_id,
      gen_random_uuid(),
      jsonb_build_object('sub', v_user_id, 'email', 'admin@vinayakplastics.com'),
      'email',
      now(), now(), now()
    );

    raise notice 'Created dummy admin user admin@vinayakplastics.com';
  else
    -- User exists: reset the password and repair any NULL token
    -- columns that break GoTrue sign-in.
    update auth.users
    set encrypted_password = crypt('Admin@123', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change_token_current = coalesce(email_change_token_current, ''),
        email_change = coalesce(email_change, ''),
        updated_at = now()
    where id = v_user_id;

    -- Make sure a matching identity exists too
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    select
      gen_random_uuid(), v_user_id, gen_random_uuid(),
      jsonb_build_object('sub', v_user_id, 'email', 'admin@vinayakplastics.com'),
      'email', now(), now(), now()
    where not exists (
      select 1 from auth.identities
      where user_id = v_user_id and provider = 'email'
    );

    raise notice 'Reset password of existing admin user to the dummy password';
  end if;
end $$;