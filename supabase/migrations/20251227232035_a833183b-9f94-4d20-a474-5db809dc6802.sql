-- Require financial module 'view' permission to read bank accounts
DROP POLICY IF EXISTS "Users can view contas_bancarias of their empresas" ON public.contas_bancarias;
CREATE POLICY "Users can view contas_bancarias with financial view permission"
ON public.contas_bancarias
FOR SELECT
USING (
  public.is_admin(auth.uid()) OR (
    public.has_empresa_access(auth.uid(), empresa_id)
    AND public.has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'view'::permission_type)
  )
);

-- Require financial module 'view' permission to read transactions
DROP POLICY IF EXISTS "Users can view transacoes of their empresas" ON public.transacoes;
CREATE POLICY "Users can view transacoes with financial view permission"
ON public.transacoes
FOR SELECT
USING (
  public.is_admin(auth.uid()) OR (
    public.has_empresa_access(auth.uid(), empresa_id)
    AND public.has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'view'::permission_type)
  )
);
