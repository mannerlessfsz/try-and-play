-- Criar tabela para rastrear qual perfil foi aplicado a cada usuário/empresa
CREATE TABLE public.user_applied_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.permission_profiles(id) ON DELETE CASCADE,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_by UUID,
  UNIQUE(user_id, empresa_id)
);

-- Enable RLS
ALTER TABLE public.user_applied_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage user_applied_profiles"
ON public.user_applied_profiles
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view user_applied_profiles"
ON public.user_applied_profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- Função para sincronizar permissões quando um perfil é alterado
CREATE OR REPLACE FUNCTION public.sync_profile_permissions()
RETURNS TRIGGER AS $$
DECLARE
  affected_user RECORD;
  profile_item RECORD;
BEGIN
  -- Para cada usuário que tem este perfil aplicado
  FOR affected_user IN 
    SELECT uap.user_id, uap.empresa_id 
    FROM public.user_applied_profiles uap 
    WHERE uap.profile_id = NEW.profile_id
  LOOP
    -- Deletar permissões antigas deste módulo/recurso para o usuário
    DELETE FROM public.user_resource_permissions 
    WHERE user_id = affected_user.user_id 
      AND empresa_id = affected_user.empresa_id
      AND module = NEW.module 
      AND resource = NEW.resource;
    
    -- Inserir a permissão atualizada
    INSERT INTO public.user_resource_permissions (
      user_id, empresa_id, module, resource, 
      can_view, can_create, can_edit, can_delete, can_export
    ) VALUES (
      affected_user.user_id, affected_user.empresa_id, NEW.module, NEW.resource,
      COALESCE(NEW.can_view, false), COALESCE(NEW.can_create, false), 
      COALESCE(NEW.can_edit, false), COALESCE(NEW.can_delete, false), 
      COALESCE(NEW.can_export, false)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para quando um item de perfil é deletado
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
      AND resource = OLD.resource;
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers
CREATE TRIGGER sync_permissions_on_profile_item_change
AFTER INSERT OR UPDATE ON public.permission_profile_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_permissions();

CREATE TRIGGER sync_permissions_on_profile_item_delete
AFTER DELETE ON public.permission_profile_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_permissions_on_delete();