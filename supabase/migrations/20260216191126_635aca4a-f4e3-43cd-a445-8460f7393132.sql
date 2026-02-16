-- =============================================
-- LIMPEZA: Remoção de tabelas órfãs/legado
-- =============================================

-- 1. user_widget_preferences: hook deletado, sem referências no código
DROP TABLE IF EXISTS public.user_widget_preferences;

-- 2. user_permissions: substituída por user_module_permissions
DROP TABLE IF EXISTS public.user_permissions;

-- 3. orcamentos: vazia, substituída por orcamentos_servico
DROP TABLE IF EXISTS public.orcamentos;

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';