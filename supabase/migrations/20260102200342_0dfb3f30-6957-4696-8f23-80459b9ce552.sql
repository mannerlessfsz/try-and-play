-- Tabela para armazenar perfis de permissões (templates)
CREATE TABLE public.permission_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  role_padrao TEXT, -- role sugerida para este perfil (admin, manager, user)
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar as permissões de cada perfil
CREATE TABLE public.permission_profile_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.permission_profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  resource TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, module, resource)
);

-- Enable RLS
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profile_items ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar perfis de permissões
CREATE POLICY "Admins can manage permission_profiles"
ON public.permission_profiles FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view permission_profiles"
ON public.permission_profiles FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage permission_profile_items"
ON public.permission_profile_items FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view permission_profile_items"
ON public.permission_profile_items FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_permission_profiles_updated_at
BEFORE UPDATE ON public.permission_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir perfis padrão
INSERT INTO public.permission_profiles (nome, descricao, role_padrao) VALUES
('Gerente Completo', 'Acesso total a todos os módulos e recursos', 'manager'),
('Financeiro', 'Acesso completo ao módulo financeiro', 'user'),
('Comercial', 'Acesso a vendas, clientes e produtos', 'user'),
('Estoquista', 'Acesso a estoque e compras', 'user'),
('Visualizador', 'Apenas visualização em todos os módulos', 'user');

-- Inserir itens para perfil "Gerente Completo" - todos os recursos com todas as permissões
INSERT INTO public.permission_profile_items (profile_id, module, resource, can_view, can_create, can_edit, can_delete, can_export)
SELECT 
  pp.id,
  unnest(ARRAY['financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace',
               'erp', 'erp', 'erp', 'erp', 'erp', 'erp', 'erp',
               'taskvault', 'taskvault']),
  unnest(ARRAY['transacoes', 'categorias', 'contas_bancarias', 'centros_custo', 'recorrencias', 'metas', 'relatorios', 'importacoes',
               'clientes', 'fornecedores', 'produtos', 'vendas', 'compras', 'orcamentos', 'estoque',
               'tarefas', 'atividades']),
  true, true, true, true, true
FROM public.permission_profiles pp
WHERE pp.nome = 'Gerente Completo';

-- Inserir itens para perfil "Financeiro"
INSERT INTO public.permission_profile_items (profile_id, module, resource, can_view, can_create, can_edit, can_delete, can_export)
SELECT 
  pp.id,
  unnest(ARRAY['financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace']),
  unnest(ARRAY['transacoes', 'categorias', 'contas_bancarias', 'centros_custo', 'recorrencias', 'metas', 'relatorios', 'importacoes']),
  true, true, true, true, true
FROM public.permission_profiles pp
WHERE pp.nome = 'Financeiro';

-- Inserir itens para perfil "Comercial"
INSERT INTO public.permission_profile_items (profile_id, module, resource, can_view, can_create, can_edit, can_delete, can_export)
SELECT 
  pp.id,
  unnest(ARRAY['erp', 'erp', 'erp', 'erp']),
  unnest(ARRAY['clientes', 'vendas', 'orcamentos', 'produtos']),
  true, true, true, false, true
FROM public.permission_profiles pp
WHERE pp.nome = 'Comercial';

-- Inserir itens para perfil "Estoquista"
INSERT INTO public.permission_profile_items (profile_id, module, resource, can_view, can_create, can_edit, can_delete, can_export)
SELECT 
  pp.id,
  unnest(ARRAY['erp', 'erp', 'erp', 'erp']),
  unnest(ARRAY['produtos', 'compras', 'fornecedores', 'estoque']),
  true, true, true, false, true
FROM public.permission_profiles pp
WHERE pp.nome = 'Estoquista';

-- Inserir itens para perfil "Visualizador" - apenas visualização
INSERT INTO public.permission_profile_items (profile_id, module, resource, can_view, can_create, can_edit, can_delete, can_export)
SELECT 
  pp.id,
  unnest(ARRAY['financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace', 'financialace',
               'erp', 'erp', 'erp', 'erp', 'erp', 'erp', 'erp',
               'taskvault', 'taskvault']),
  unnest(ARRAY['transacoes', 'categorias', 'contas_bancarias', 'centros_custo', 'recorrencias', 'metas', 'relatorios', 'importacoes',
               'clientes', 'fornecedores', 'produtos', 'vendas', 'compras', 'orcamentos', 'estoque',
               'tarefas', 'atividades']),
  true, false, false, false, false
FROM public.permission_profiles pp
WHERE pp.nome = 'Visualizador';