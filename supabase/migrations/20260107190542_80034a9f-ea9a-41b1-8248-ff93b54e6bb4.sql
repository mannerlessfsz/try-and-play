-- ============================================================================
-- REFATORAÇÃO DO SISTEMA DE PERMISSÕES - NOVA TABELA SIMPLIFICADA
-- ============================================================================

-- 1. Criar nova tabela simplificada de permissões por módulo
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  is_pro_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_module_permissions_unique UNIQUE NULLS NOT DISTINCT (user_id, empresa_id, module)
);

-- 2. Habilitar RLS
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
CREATE POLICY "admin_full_access_user_module_perms" ON public.user_module_permissions
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_view_own_module_perms" ON public.user_module_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_user_module_perms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_module_perms_updated_at
  BEFORE UPDATE ON public.user_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_module_perms_updated_at();

-- 5. Função para verificar acesso a módulo (nova, simplificada)
CREATE OR REPLACE FUNCTION public.has_module_permission(
  p_user_id UUID,
  p_module TEXT,
  p_action TEXT DEFAULT 'view',
  p_empresa_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission BOOLEAN := false;
BEGIN
  -- Admin sempre tem permissão
  IF public.is_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Buscar permissão específica
  SELECT 
    CASE p_action
      WHEN 'view' THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
      WHEN 'export' THEN can_export
      ELSE false
    END
  INTO v_has_permission
  FROM public.user_module_permissions
  WHERE user_id = p_user_id 
    AND module = p_module
    AND (
      (empresa_id IS NULL AND p_empresa_id IS NULL)
      OR empresa_id = p_empresa_id
    );
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- 6. Função RPC para conceder permissões (chamada pelo admin)
CREATE OR REPLACE FUNCTION public.grant_module_permission(
  p_user_id UUID,
  p_module TEXT,
  p_empresa_id UUID DEFAULT NULL,
  p_can_view BOOLEAN DEFAULT false,
  p_can_create BOOLEAN DEFAULT false,
  p_can_edit BOOLEAN DEFAULT false,
  p_can_delete BOOLEAN DEFAULT false,
  p_can_export BOOLEAN DEFAULT false,
  p_is_pro_mode BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem conceder permissões';
  END IF;
  
  INSERT INTO public.user_module_permissions (
    user_id, empresa_id, module, 
    can_view, can_create, can_edit, can_delete, can_export, is_pro_mode
  ) VALUES (
    p_user_id, p_empresa_id, p_module,
    p_can_view, p_can_create, p_can_edit, p_can_delete, p_can_export, p_is_pro_mode
  )
  ON CONFLICT ON CONSTRAINT user_module_permissions_unique
  DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_export = EXCLUDED.can_export,
    is_pro_mode = EXCLUDED.is_pro_mode,
    updated_at = now()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$;

-- 7. Função RPC para revogar permissão
CREATE OR REPLACE FUNCTION public.revoke_module_permission(
  p_user_id UUID,
  p_module TEXT,
  p_empresa_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar permissões';
  END IF;
  
  DELETE FROM public.user_module_permissions
  WHERE user_id = p_user_id 
    AND module = p_module
    AND (
      (empresa_id IS NULL AND p_empresa_id IS NULL)
      OR empresa_id = p_empresa_id
    );
  
  RETURN FOUND;
END;
$$;

-- 8. Função para obter permissões de um usuário
CREATE OR REPLACE FUNCTION public.get_user_module_permissions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  empresa_id UUID,
  module TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  can_export BOOLEAN,
  is_pro_mode BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ump.id, ump.user_id, ump.empresa_id, ump.module,
    ump.can_view, ump.can_create, ump.can_edit, ump.can_delete, ump.can_export,
    ump.is_pro_mode
  FROM public.user_module_permissions ump
  WHERE ump.user_id = p_user_id;
$$;

-- 9. Índices
CREATE INDEX IF NOT EXISTS idx_user_module_perms_user ON public.user_module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_perms_empresa ON public.user_module_permissions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_module_perms_module ON public.user_module_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_module_perms_lookup ON public.user_module_permissions(user_id, empresa_id, module);

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_module_permissions;