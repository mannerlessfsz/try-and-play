
-- Sincronizar permissões para TODOS os usuários vinculados a empresas que têm módulos ativos
-- Isso corrige usuários existentes que não receberam permissões

INSERT INTO user_module_permissions (user_id, empresa_id, module, can_view, can_create, can_edit, can_delete, can_export, is_pro_mode)
SELECT 
  ue.user_id,
  ue.empresa_id,
  em.modulo::text,
  true,  -- can_view
  true,  -- can_create
  true,  -- can_edit
  true,  -- can_delete
  true,  -- can_export
  (em.modo = 'pro')  -- is_pro_mode
FROM user_empresas ue
JOIN empresa_modulos em ON em.empresa_id = ue.empresa_id AND em.ativo = true
WHERE NOT EXISTS (
  SELECT 1 
  FROM user_module_permissions ump 
  WHERE ump.user_id = ue.user_id 
    AND ump.empresa_id = ue.empresa_id 
    AND ump.module = em.modulo::text
);

-- Criar trigger para sincronizar automaticamente no futuro
CREATE OR REPLACE FUNCTION sync_user_permissions_on_empresa_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um usuário é vinculado a uma empresa, criar permissões para todos os módulos ativos
  INSERT INTO user_module_permissions (user_id, empresa_id, module, can_view, can_create, can_edit, can_delete, can_export, is_pro_mode)
  SELECT 
    NEW.user_id,
    NEW.empresa_id,
    em.modulo::text,
    true,
    true,
    true,
    true,
    true,
    (em.modo = 'pro')
  FROM empresa_modulos em
  WHERE em.empresa_id = NEW.empresa_id AND em.ativo = true
  ON CONFLICT (user_id, empresa_id, module) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remover trigger antigo se existir e criar novo
DROP TRIGGER IF EXISTS on_user_empresa_link ON user_empresas;
CREATE TRIGGER on_user_empresa_link
  AFTER INSERT ON user_empresas
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_permissions_on_empresa_link();

-- Trigger para quando um novo módulo é adicionado à empresa
CREATE OR REPLACE FUNCTION sync_permissions_on_new_module()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um módulo é ativado na empresa, dar permissões a todos os usuários vinculados
  IF NEW.ativo = true THEN
    INSERT INTO user_module_permissions (user_id, empresa_id, module, can_view, can_create, can_edit, can_delete, can_export, is_pro_mode)
    SELECT 
      ue.user_id,
      NEW.empresa_id,
      NEW.modulo::text,
      true,
      true,
      true,
      true,
      true,
      (NEW.modo = 'pro')
    FROM user_empresas ue
    WHERE ue.empresa_id = NEW.empresa_id
    ON CONFLICT (user_id, empresa_id, module) DO UPDATE SET
      is_pro_mode = EXCLUDED.is_pro_mode,
      can_view = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_empresa_module_added ON empresa_modulos;
CREATE TRIGGER on_empresa_module_added
  AFTER INSERT OR UPDATE ON empresa_modulos
  FOR EACH ROW
  EXECUTE FUNCTION sync_permissions_on_new_module();
