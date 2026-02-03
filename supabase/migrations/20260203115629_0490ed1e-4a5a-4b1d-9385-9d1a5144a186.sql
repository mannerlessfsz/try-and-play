-- Corrigir permissões: se tem qualquer permissão (create, edit, delete, export) ou pro_mode,
-- então can_view deve ser true (não faz sentido poder criar/editar sem poder visualizar)
UPDATE user_module_permissions
SET can_view = true
WHERE can_view = false
  AND (can_create = true OR can_edit = true OR can_delete = true OR can_export = true OR is_pro_mode = true);

-- Também garantir que registros com todas permissões false mas is_pro_mode true tenham can_view = true
UPDATE user_module_permissions
SET can_view = true
WHERE is_pro_mode = true AND can_view = false;