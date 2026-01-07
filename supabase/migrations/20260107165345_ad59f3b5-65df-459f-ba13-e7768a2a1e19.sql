-- Drop existing triggers to recreate with correct logic
DROP TRIGGER IF EXISTS sync_permissions_on_profile_item_change ON public.permission_profile_items;
DROP TRIGGER IF EXISTS sync_permissions_on_profile_item_delete ON public.permission_profile_items;

-- Improved function to sync permissions when a profile item is inserted or updated
CREATE OR REPLACE FUNCTION public.sync_profile_permissions()
RETURNS TRIGGER AS $$
DECLARE
  affected_user RECORD;
BEGIN
  -- Para cada usuário que tem este perfil aplicado
  FOR affected_user IN 
    SELECT uap.user_id, uap.empresa_id 
    FROM public.user_applied_profiles uap 
    WHERE uap.profile_id = NEW.profile_id
  LOOP
    -- Deletar permissões antigas deste módulo/sub_module/recurso para o usuário
    DELETE FROM public.user_resource_permissions 
    WHERE user_id = affected_user.user_id 
      AND empresa_id = affected_user.empresa_id
      AND module = NEW.module 
      AND resource = NEW.resource
      AND (sub_module = NEW.sub_module OR (sub_module IS NULL AND NEW.sub_module IS NULL));
    
    -- Inserir a permissão atualizada
    INSERT INTO public.user_resource_permissions (
      user_id, empresa_id, module, sub_module, resource, 
      can_view, can_create, can_edit, can_delete, can_export
    ) VALUES (
      affected_user.user_id, affected_user.empresa_id, NEW.module, NEW.sub_module, NEW.resource,
      COALESCE(NEW.can_view, false), COALESCE(NEW.can_create, false), 
      COALESCE(NEW.can_edit, false), COALESCE(NEW.can_delete, false), 
      COALESCE(NEW.can_export, false)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Improved function for when a permission item is deleted from a profile
CREATE OR REPLACE FUNCTION public.sync_profile_permissions_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  affected_user RECORD;
BEGIN
  -- Deletar permissões correspondentes de todos os usuários com este perfil
  FOR affected_user IN 
    SELECT uap.user_id, uap.empresa_id 
    FROM public.user_applied_profiles uap 
    WHERE uap.profile_id = OLD.profile_id
  LOOP
    DELETE FROM public.user_resource_permissions 
    WHERE user_id = affected_user.user_id 
      AND empresa_id = affected_user.empresa_id
      AND module = OLD.module 
      AND resource = OLD.resource
      AND (sub_module = OLD.sub_module OR (sub_module IS NULL AND OLD.sub_module IS NULL));
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers
CREATE TRIGGER sync_permissions_on_profile_item_change
AFTER INSERT OR UPDATE ON public.permission_profile_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_permissions();

CREATE TRIGGER sync_permissions_on_profile_item_delete
AFTER DELETE ON public.permission_profile_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_permissions_on_delete();