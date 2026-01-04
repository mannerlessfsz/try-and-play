-- Dropar e recriar a função get_empresas_safe com regime_tributario
DROP FUNCTION IF EXISTS public.get_empresas_safe();

CREATE FUNCTION public.get_empresas_safe()
RETURNS TABLE(
  id UUID,
  nome TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  manager_id UUID,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  regime_tributario public.regime_tributario
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
    CASE WHEN public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), e.id) THEN e.telefone ELSE NULL END AS telefone,
    e.regime_tributario
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