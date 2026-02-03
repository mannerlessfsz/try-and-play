-- Corrigir a função has_permission para usar user_module_permissions
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid, 
  _empresa_id uuid, 
  _module app_module, 
  _permission permission_type
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    public.is_admin(_user_id) 
    OR EXISTS (
      SELECT 1
      FROM public.user_module_permissions
      WHERE user_id = _user_id
        AND (empresa_id = _empresa_id OR empresa_id IS NULL)
        AND module::text = _module::text
        AND CASE 
          WHEN _permission = 'view' THEN can_view
          WHEN _permission = 'create' THEN can_create
          WHEN _permission = 'edit' THEN can_edit
          WHEN _permission = 'delete' THEN can_delete
          WHEN _permission = 'export' THEN can_export
          ELSE false
        END = true
    )
$$;