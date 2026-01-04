-- Criar enum para departamentos
CREATE TYPE public.departamento_tipo AS ENUM ('fiscal', 'contabil', 'departamento_pessoal');

-- Tabela de contatos por empresa
CREATE TABLE public.empresa_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cargo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela relacional contato <-> departamentos
CREATE TABLE public.contato_departamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contato_id UUID NOT NULL REFERENCES public.empresa_contatos(id) ON DELETE CASCADE,
  departamento public.departamento_tipo NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contato_id, departamento)
);

-- Adicionar campo departamento na tabela tarefas
ALTER TABLE public.tarefas 
ADD COLUMN departamento public.departamento_tipo;

-- Adicionar campo contato_id para associar tarefa a um contato específico
ALTER TABLE public.tarefas 
ADD COLUMN contato_id UUID REFERENCES public.empresa_contatos(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_empresa_contatos_empresa ON public.empresa_contatos(empresa_id);
CREATE INDEX idx_empresa_contatos_ativo ON public.empresa_contatos(ativo);
CREATE INDEX idx_contato_departamentos_contato ON public.contato_departamentos(contato_id);
CREATE INDEX idx_contato_departamentos_departamento ON public.contato_departamentos(departamento);
CREATE INDEX idx_tarefas_departamento ON public.tarefas(departamento);
CREATE INDEX idx_tarefas_contato ON public.tarefas(contato_id);

-- RLS para empresa_contatos
ALTER TABLE public.empresa_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver contatos de empresas que têm acesso"
ON public.empresa_contatos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.empresa_id = empresa_contatos.empresa_id
    AND ue.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Usuários podem gerenciar contatos de empresas que têm acesso"
ON public.empresa_contatos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.empresa_id = empresa_contatos.empresa_id
    AND ue.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- RLS para contato_departamentos
ALTER TABLE public.contato_departamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver departamentos de contatos que têm acesso"
ON public.contato_departamentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.empresa_contatos ec
    JOIN public.user_empresas ue ON ue.empresa_id = ec.empresa_id
    WHERE ec.id = contato_departamentos.contato_id
    AND ue.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Usuários podem gerenciar departamentos de contatos que têm acesso"
ON public.contato_departamentos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.empresa_contatos ec
    JOIN public.user_empresas ue ON ue.empresa_id = ec.empresa_id
    WHERE ec.id = contato_departamentos.contato_id
    AND ue.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- Trigger para updated_at
CREATE TRIGGER update_empresa_contatos_updated_at
BEFORE UPDATE ON public.empresa_contatos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();