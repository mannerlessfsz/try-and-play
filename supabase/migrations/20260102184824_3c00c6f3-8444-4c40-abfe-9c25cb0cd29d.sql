-- Fix admin visibility/editing of users and add a repair RPC to sync missing profiles

-- 1) PROFILES: allow admins (platform) to view and update ANY profile
DO $$
BEGIN
  -- Drop overly-restrictive admin policy (only users linked to empresas)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can view profiles of users in their empresas'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can view profiles of users in their empresas" ON public.profiles';
  END IF;
END $$;

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update all profiles (needed for editar/inativar no /admin)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- 2) RPC: repair missing rows in public.profiles for users that exist in auth
-- NOTE: avoids relying on triggers; callable by admins and safe-guarded.
CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, ativo)
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'full_name', u.email),
    true
  FROM auth.users u
  WHERE u.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = u.id
    );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_missing_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_missing_profiles() TO authenticated;