-- Fix security vulnerabilities: Strengthen RLS policies for profiles and empresas tables

-- 1. Drop existing policies for profiles that allow admin to see all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 2. Create more restrictive policy for profiles
-- Users can only view their own profile (admins can still see all for admin panel functionality)
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. Create separate policy for admins with proper scoping
CREATE POLICY "Admins can view profiles of users in their empresas"
ON public.profiles
FOR SELECT
USING (
  public.is_admin(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = profiles.id
  )
);

-- 4. Drop existing policy for empresas
DROP POLICY IF EXISTS "Users can view their empresas" ON public.empresas;

-- 5. Create more restrictive policy for empresas - only view empresas user is explicitly linked to
CREATE POLICY "Users can view only their linked empresas"
ON public.empresas
FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = empresas.id
  )
);