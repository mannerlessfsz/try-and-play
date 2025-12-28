-- Make empresas SELECT explicitly authenticated-only to satisfy scanners and prevent any anonymous access
DROP POLICY IF EXISTS "Owners/admins can view empresas" ON public.empresas;
DROP POLICY IF EXISTS "Owners/admins can view empresas (authenticated only)" ON public.empresas;

CREATE POLICY "Owners/admins can view empresas (authenticated only)"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), id))
);
