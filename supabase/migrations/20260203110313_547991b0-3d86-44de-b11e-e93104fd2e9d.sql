-- Função para criar usuário por admin (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verificar se o chamador é admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar usuários';
  END IF;

  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email já está em uso';
  END IF;

  -- Criar usuário no auth.users
  INSERT INTO auth.users (
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
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), -- email já confirmado
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', COALESCE(p_full_name, '')),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Criar perfil (trigger pode já criar, mas garantimos)
  INSERT INTO public.profiles (id, email, full_name, ativo)
  VALUES (v_user_id, p_email, p_full_name, true)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = EXCLUDED.email;

  -- Atribuir role padrão de usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_user_id;
END;
$$;