UPDATE auth.users
SET encrypted_password = crypt('Ceotto2468', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'pilar@pilar.com.br';

UPDATE public.user_security_flags
SET must_change_password = false,
    password_changed_at = now(),
    updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'pilar@pilar.com.br');