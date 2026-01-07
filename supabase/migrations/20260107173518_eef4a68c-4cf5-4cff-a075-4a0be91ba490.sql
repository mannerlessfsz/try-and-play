
-- Criar função para reaplicar todas as permissões de um perfil aos seus usuários
CREATE OR REPLACE FUNCTION public.reapply_profile_permissions(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  affected_user RECORD;
  profile_item RECORD;
  total_updated INTEGER := 0;
BEGIN
  -- Para cada usuário que tem este perfil aplicado
  FOR affected_user IN 
    SELECT uap.user_id, uap.empresa_id 
    FROM public.user_applied_profiles uap 
    WHERE uap.profile_id = p_profile_id
  LOOP
    -- Deletar todas as permissões atuais deste usuário/empresa
    DELETE FROM public.user_resource_permissions 
    WHERE user_id = affected_user.user_id 
      AND empresa_id = affected_user.empresa_id;
    
    -- Inserir todas as permissões do perfil
    FOR profile_item IN 
      SELECT * FROM public.permission_profile_items 
      WHERE profile_id = p_profile_id
    LOOP
      INSERT INTO public.user_resource_permissions (
        user_id, empresa_id, module, sub_module, resource, 
        can_view, can_create, can_edit, can_delete, can_export
      ) VALUES (
        affected_user.user_id, affected_user.empresa_id, 
        profile_item.module, profile_item.sub_module, profile_item.resource,
        COALESCE(profile_item.can_view, false), 
        COALESCE(profile_item.can_create, false), 
        COALESCE(profile_item.can_edit, false), 
        COALESCE(profile_item.can_delete, false), 
        COALESCE(profile_item.can_export, false)
      );
      total_updated := total_updated + 1;
    END LOOP;
  END LOOP;
  
  RETURN total_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar função para aplicar perfil a um usuário (chamada via RPC do frontend)
CREATE OR REPLACE FUNCTION public.apply_permission_profile(
  p_user_id UUID,
  p_empresa_id UUID,
  p_profile_id UUID,
  p_assign_role BOOLEAN DEFAULT true
)
RETURNS INTEGER AS $$
DECLARE
  profile_item RECORD;
  profile_record RECORD;
  total_inserted INTEGER := 0;
BEGIN
  -- Buscar perfil
  SELECT * INTO profile_record FROM public.permission_profiles WHERE id = p_profile_id;
  
  IF profile_record IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  -- Deletar permissões existentes deste usuário/empresa
  DELETE FROM public.user_resource_permissions 
  WHERE user_id = p_user_id 
    AND empresa_id = p_empresa_id;
  
  -- Inserir todas as permissões do perfil
  FOR profile_item IN 
    SELECT * FROM public.permission_profile_items 
    WHERE profile_id = p_profile_id
  LOOP
    INSERT INTO public.user_resource_permissions (
      user_id, empresa_id, module, sub_module, resource, 
      can_view, can_create, can_edit, can_delete, can_export
    ) VALUES (
      p_user_id, p_empresa_id, 
      profile_item.module, profile_item.sub_module, profile_item.resource,
      COALESCE(profile_item.can_view, false), 
      COALESCE(profile_item.can_create, false), 
      COALESCE(profile_item.can_edit, false), 
      COALESCE(profile_item.can_delete, false), 
      COALESCE(profile_item.can_export, false)
    );
    total_inserted := total_inserted + 1;
  END LOOP;
  
  -- Registrar perfil aplicado
  INSERT INTO public.user_applied_profiles (user_id, empresa_id, profile_id, applied_at)
  VALUES (p_user_id, p_empresa_id, p_profile_id, NOW())
  ON CONFLICT (user_id, empresa_id) 
  DO UPDATE SET profile_id = p_profile_id, applied_at = NOW();
  
  -- Atribuir role padrão se configurado
  IF p_assign_role AND profile_record.role_padrao IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, profile_record.role_padrao::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN total_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Adicionar função para sincronizar automaticamente quando o perfil é salvo
-- Esta função é chamada quando qualquer item do perfil muda
CREATE OR REPLACE FUNCTION public.sync_all_profile_permissions()
RETURNS TRIGGER AS $$
DECLARE
  profile_id_to_sync UUID;
BEGIN
  -- Determinar qual profile_id sincronizar
  IF TG_OP = 'DELETE' THEN
    profile_id_to_sync := OLD.profile_id;
  ELSE
    profile_id_to_sync := NEW.profile_id;
  END IF;
  
  -- Reaplicar todas as permissões do perfil para todos os usuários que o têm
  PERFORM public.reapply_profile_permissions(profile_id_to_sync);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Substituir os triggers anteriores por um mais robusto
DROP TRIGGER IF EXISTS sync_permissions_on_profile_item_change ON public.permission_profile_items;
DROP TRIGGER IF EXISTS sync_permissions_on_profile_item_delete ON public.permission_profile_items;

CREATE TRIGGER sync_all_profile_permissions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.permission_profile_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_all_profile_permissions();
