-- Permitir empresa_id nulo na tabela user_resource_permissions para permissões standalone
ALTER TABLE public.user_resource_permissions 
ALTER COLUMN empresa_id DROP NOT NULL;

-- Atualizar constraint única para incluir casos com empresa_id nulo
-- Primeiro remover a constraint existente se houver
DO $$
BEGIN
  -- Tentar remover constraint existente
  BEGIN
    ALTER TABLE public.user_resource_permissions 
    DROP CONSTRAINT IF EXISTS user_resource_permissions_user_id_empresa_id_module_resourc_key;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Criar índice único que trata null corretamente
CREATE UNIQUE INDEX IF NOT EXISTS user_resource_permissions_unique_idx 
ON public.user_resource_permissions (user_id, COALESCE(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), module, resource);

-- Atualizar RLS para permitir acesso a permissões standalone
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_resource_permissions;
CREATE POLICY "Users can view own permissions" 
ON public.user_resource_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.user_resource_permissions;
CREATE POLICY "Admins can manage all permissions" 
ON public.user_resource_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);