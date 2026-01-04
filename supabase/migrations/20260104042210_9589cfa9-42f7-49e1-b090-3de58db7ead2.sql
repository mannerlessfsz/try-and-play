-- Add sub_module column to permission_profile_items
ALTER TABLE public.permission_profile_items 
ADD COLUMN sub_module text;

-- Add sub_module column to user_resource_permissions
ALTER TABLE public.user_resource_permissions 
ADD COLUMN sub_module text;

-- Create index for performance
CREATE INDEX idx_permission_profile_items_sub_module ON public.permission_profile_items(sub_module);
CREATE INDEX idx_user_resource_permissions_sub_module ON public.user_resource_permissions(sub_module);

-- Update existing records to have appropriate sub_modules based on resource
-- Financeiro resources
UPDATE public.permission_profile_items SET sub_module = 'financeiro' 
WHERE module = 'gestao' AND resource IN ('dashboard', 'transacoes', 'contas_bancarias', 'categorias', 'centros_custo', 'recorrencias', 'metas', 'relatorios', 'orcamentos', 'importacoes');

UPDATE public.user_resource_permissions SET sub_module = 'financeiro' 
WHERE module = 'gestao' AND resource IN ('dashboard', 'transacoes', 'contas_bancarias', 'categorias', 'centros_custo', 'recorrencias', 'metas', 'relatorios', 'orcamentos', 'importacoes');

-- ERP resources
UPDATE public.permission_profile_items SET sub_module = 'erp' 
WHERE module = 'gestao' AND resource IN ('produtos', 'clientes', 'fornecedores', 'vendas', 'compras', 'estoque', 'orcamentos_servico');

UPDATE public.user_resource_permissions SET sub_module = 'erp' 
WHERE module = 'gestao' AND resource IN ('produtos', 'clientes', 'fornecedores', 'vendas', 'compras', 'estoque', 'orcamentos_servico');

-- Tarefas resources  
UPDATE public.permission_profile_items SET sub_module = 'tarefas' 
WHERE module = 'gestao' AND resource IN ('tarefas', 'atividades');

UPDATE public.user_resource_permissions SET sub_module = 'tarefas' 
WHERE module = 'gestao' AND resource IN ('tarefas', 'atividades');