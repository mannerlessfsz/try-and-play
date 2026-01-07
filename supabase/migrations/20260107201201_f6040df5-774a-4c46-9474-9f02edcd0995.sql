-- Função para sincronizar permissões de usuários quando o modo do módulo da empresa mudar
CREATE OR REPLACE FUNCTION public.sync_user_permissions_on_module_mode_change()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Se o modo mudou
  IF OLD.modo IS DISTINCT FROM NEW.modo THEN
    -- Para cada usuário vinculado a esta empresa
    FOR user_record IN 
      SELECT ue.user_id 
      FROM user_empresas ue 
      WHERE ue.empresa_id = NEW.empresa_id
    LOOP
      -- Atualizar is_pro_mode para todos os módulos desse usuário nessa empresa
      UPDATE user_module_permissions
      SET 
        is_pro_mode = (NEW.modo = 'pro'),
        updated_at = now()
      WHERE 
        user_id = user_record.user_id 
        AND empresa_id = NEW.empresa_id
        AND module = NEW.modulo::text;
    END LOOP;
    
    -- Log da mudança
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, details)
    SELECT 
      auth.uid(),
      'UPDATE_MODULE_MODE',
      'empresa_modulos',
      NEW.id::text,
      jsonb_build_object('modo', OLD.modo),
      jsonb_build_object('modo', NEW.modo),
      format('Modo do módulo %s alterado de %s para %s na empresa %s', 
        NEW.modulo, OLD.modo, NEW.modo, NEW.empresa_id)
    WHERE auth.uid() IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para sincronizar permissões quando modo muda
DROP TRIGGER IF EXISTS sync_permissions_on_module_mode_change ON public.empresa_modulos;
CREATE TRIGGER sync_permissions_on_module_mode_change
  AFTER UPDATE ON public.empresa_modulos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_permissions_on_module_mode_change();

-- Função para garantir que novas permissões de usuário herdem o modo da empresa
CREATE OR REPLACE FUNCTION public.inherit_empresa_module_mode()
RETURNS TRIGGER AS $$
DECLARE
  empresa_modo text;
BEGIN
  -- Se tem empresa_id, verificar o modo do módulo da empresa
  IF NEW.empresa_id IS NOT NULL THEN
    SELECT modo INTO empresa_modo
    FROM empresa_modulos
    WHERE empresa_id = NEW.empresa_id
      AND modulo = NEW.module::app_module
      AND ativo = true
    LIMIT 1;
    
    -- Se encontrou, aplicar o modo da empresa
    IF empresa_modo IS NOT NULL THEN
      NEW.is_pro_mode := (empresa_modo = 'pro');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para herdar modo ao criar permissão
DROP TRIGGER IF EXISTS inherit_module_mode_on_permission_create ON public.user_module_permissions;
CREATE TRIGGER inherit_module_mode_on_permission_create
  BEFORE INSERT ON public.user_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_empresa_module_mode();

-- Função RPC para aplicar modo de módulo para todos os usuários da empresa
CREATE OR REPLACE FUNCTION public.apply_module_mode_to_users(
  _empresa_id uuid,
  _modulo text,
  _modo text
)
RETURNS void AS $$
DECLARE
  is_pro boolean;
BEGIN
  is_pro := (_modo = 'pro');
  
  -- Atualizar todas as permissões existentes dos usuários desta empresa para este módulo
  UPDATE user_module_permissions
  SET 
    is_pro_mode = is_pro,
    updated_at = now()
  WHERE 
    empresa_id = _empresa_id
    AND module = _modulo;
    
  -- Log
  INSERT INTO audit_logs (user_id, action, table_name, record_id, details)
  SELECT 
    auth.uid(),
    'BULK_UPDATE_PRO_MODE',
    'user_module_permissions',
    _empresa_id::text,
    format('Pro mode %s para módulo %s em todos os usuários da empresa', 
      CASE WHEN is_pro THEN 'ativado' ELSE 'desativado' END, _modulo)
  WHERE auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;