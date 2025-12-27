-- Remove insecure view and expose a safe RPC instead
DROP VIEW IF EXISTS public.empresas_view;

-- Safe empresa listing: masks CNPJ/email/telefone unless admin or empresa owner
CREATE OR REPLACE FUNCTION public.get_empresas_safe()
RETURNS TABLE (
  id uuid,
  nome text,
  created_at timestamptz,
  updated_at timestamptz,
  manager_id uuid,
  cnpj text,
  email text,
  telefone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.nome,
    e.created_at,
    e.updated_at,
    e.manager_id,
    CASE WHEN public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), e.id) THEN e.cnpj ELSE NULL END AS cnpj,
    CASE WHEN public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), e.id) THEN e.email ELSE NULL END AS email,
    CASE WHEN public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), e.id) THEN e.telefone ELSE NULL END AS telefone
  FROM public.empresas e
  WHERE
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid()
        AND ue.empresa_id = e.id
    );
$$;

REVOKE ALL ON FUNCTION public.get_empresas_safe() FROM public;
GRANT EXECUTE ON FUNCTION public.get_empresas_safe() TO authenticated;

-- Tighten base table visibility: only admins/owners can read raw empresas rows
DROP POLICY IF EXISTS "Users can view only their linked empresas" ON public.empresas;
CREATE POLICY "Owners/admins can view empresas"
ON public.empresas
FOR SELECT
USING (public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), id));

-- Block anonymous access to sensitive tables (RLS already restricts rows, but this removes anonymous querying entirely)
REVOKE ALL ON TABLE public.empresas FROM anon;
REVOKE ALL ON TABLE public.profiles FROM anon;

-- Ensure authenticated access remains available for the app
GRANT SELECT ON TABLE public.empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
