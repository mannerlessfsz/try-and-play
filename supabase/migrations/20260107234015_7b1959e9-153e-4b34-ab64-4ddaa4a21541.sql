
-- Recriar a função get_empresas_safe com o novo campo
CREATE FUNCTION public.get_empresas_safe()
RETURNS TABLE(
  id uuid, 
  nome text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  manager_id uuid, 
  cnpj text, 
  email text, 
  telefone text, 
  regime_tributario regime_tributario,
  ativo boolean
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
    e.regime_tributario,
    e.ativo
  FROM public.empresas e
  WHERE
    public.is_admin(auth.uid())
    OR (
      e.ativo = true
      AND EXISTS (
        SELECT 1
        FROM public.user_empresas ue
        WHERE ue.user_id = auth.uid()
          AND ue.empresa_id = e.id
      )
    );
$$;

-- Criar view de integridade
DROP VIEW IF EXISTS public.v_system_integrity;
CREATE VIEW public.v_system_integrity AS
SELECT
  'usuarios_inativos_com_permissoes' as tipo,
  COUNT(*) as quantidade
FROM public.profiles p
JOIN public.user_module_permissions ump ON p.id = ump.user_id
WHERE p.ativo = false AND (ump.can_view = true OR ump.can_create = true)

UNION ALL

SELECT
  'empresas_inativas_com_modulos_ativos' as tipo,
  COUNT(*) as quantidade
FROM public.empresas e
JOIN public.empresa_modulos em ON e.id = em.empresa_id
WHERE e.ativo = false AND em.ativo = true

UNION ALL

SELECT
  'modulos_inativos_com_permissoes' as tipo,
  COUNT(*) as quantidade
FROM public.empresa_modulos em
JOIN public.user_module_permissions ump ON em.empresa_id = ump.empresa_id AND em.modulo::text = ump.module
WHERE em.ativo = false AND (ump.can_view = true OR ump.can_create = true);

-- Função de correção de inconsistências
CREATE OR REPLACE FUNCTION public.fix_permission_inconsistencies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_users int := 0;
  v_fixed_empresas int := 0;
  v_fixed_modules int := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta função';
  END IF;
  
  -- Corrigir permissões de usuários inativos
  UPDATE public.user_module_permissions
  SET can_view = false, can_create = false, can_edit = false, 
      can_delete = false, can_export = false, updated_at = now()
  WHERE user_id IN (SELECT id FROM public.profiles WHERE ativo = false)
    AND (can_view = true OR can_create = true OR can_edit = true OR can_delete = true OR can_export = true);
  GET DIAGNOSTICS v_fixed_users = ROW_COUNT;
  
  -- Desativar módulos de empresas inativas
  UPDATE public.empresa_modulos
  SET ativo = false, updated_at = now()
  WHERE empresa_id IN (SELECT id FROM public.empresas WHERE ativo = false)
    AND ativo = true;
  GET DIAGNOSTICS v_fixed_empresas = ROW_COUNT;
  
  -- Corrigir permissões de módulos inativos
  UPDATE public.user_module_permissions ump
  SET can_view = false, can_create = false, can_edit = false, 
      can_delete = false, can_export = false, updated_at = now()
  FROM public.empresa_modulos em
  WHERE ump.empresa_id = em.empresa_id 
    AND ump.module = em.modulo::text
    AND em.ativo = false
    AND (ump.can_view = true OR ump.can_create = true);
  GET DIAGNOSTICS v_fixed_modules = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'usuarios_corrigidos', v_fixed_users,
    'modulos_empresa_corrigidos', v_fixed_empresas,
    'permissoes_modulo_corrigidas', v_fixed_modules
  );
END;
$$;
