
-- Drop permissive policies
DROP POLICY IF EXISTS "Users can insert apae_banco_aplicacoes_empresa" ON public.apae_banco_aplicacoes_empresa;
DROP POLICY IF EXISTS "Users can update apae_banco_aplicacoes_empresa" ON public.apae_banco_aplicacoes_empresa;
DROP POLICY IF EXISTS "Users can delete apae_banco_aplicacoes_empresa" ON public.apae_banco_aplicacoes_empresa;
DROP POLICY IF EXISTS "Users can view apae_banco_aplicacoes_empresa" ON public.apae_banco_aplicacoes_empresa;

-- Recreate with proper access control
CREATE POLICY "Deny anon apae_banco_aplicacoes_empresa"
  ON public.apae_banco_aplicacoes_empresa
  FOR SELECT USING (false);

CREATE POLICY "Users can manage apae_banco_aplicacoes_empresa"
  ON public.apae_banco_aplicacoes_empresa
  FOR ALL USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));
