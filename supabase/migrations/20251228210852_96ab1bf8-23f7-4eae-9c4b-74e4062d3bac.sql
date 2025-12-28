-- Explicitly deny anonymous reads (scanner-friendly hardening)
-- PROFILES
DROP POLICY IF EXISTS "Deny anon profiles" ON public.profiles;
CREATE POLICY "Deny anon profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- EMPRESAS
DROP POLICY IF EXISTS "Owners/admins can view empresas (authenticated only)" ON public.empresas;
CREATE POLICY "Owners/admins can view empresas (authenticated only)"
ON public.empresas
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), id));

DROP POLICY IF EXISTS "Deny anon empresas" ON public.empresas;
CREATE POLICY "Deny anon empresas"
ON public.empresas
FOR SELECT
TO anon
USING (false);
