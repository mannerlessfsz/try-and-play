-- Remover políticas antigas da tabela clientes
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;
DROP POLICY IF EXISTS "Users can view clientes of their empresas" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert clientes in their empresas" ON public.clientes;
DROP POLICY IF EXISTS "Users can update clientes in their empresas" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete clientes in their empresas" ON public.clientes;

-- Criar função auxiliar para verificar acesso à empresa (evita recursão)
CREATE OR REPLACE FUNCTION public.user_has_empresa_access(check_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE user_id = auth.uid()
    AND empresa_id = check_empresa_id
  )
  OR public.has_role(auth.uid(), 'admin')
$$;

-- Novas políticas RLS granulares para clientes
CREATE POLICY "clientes_select_by_empresa"
ON public.clientes
FOR SELECT
TO authenticated
USING (public.user_has_empresa_access(empresa_id));

CREATE POLICY "clientes_insert_by_empresa"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_empresa_access(empresa_id));

CREATE POLICY "clientes_update_by_empresa"
ON public.clientes
FOR UPDATE
TO authenticated
USING (public.user_has_empresa_access(empresa_id));

CREATE POLICY "clientes_delete_by_empresa"
ON public.clientes
FOR DELETE
TO authenticated
USING (public.user_has_empresa_access(empresa_id));