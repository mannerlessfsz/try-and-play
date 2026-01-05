-- Habilitar realtime para a tabela de permissões
ALTER TABLE public.user_resource_permissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_resource_permissions;

-- Também habilitar para user_roles e user_permissions para consistência completa
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;

ALTER TABLE public.user_permissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;