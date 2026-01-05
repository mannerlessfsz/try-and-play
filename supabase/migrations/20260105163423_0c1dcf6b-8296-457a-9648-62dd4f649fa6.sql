-- Tabela para salvar prompts/conversas por dia
CREATE TABLE public.admin_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela para salvar lógicas programadas
CREATE TABLE public.admin_logicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo TEXT NOT NULL,
  nome_logica TEXT NOT NULL,
  versao TEXT NOT NULL DEFAULT '1.0.0',
  descricao TEXT,
  codigo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para melhor performance
CREATE INDEX idx_admin_prompts_data ON public.admin_prompts(data DESC);
CREATE INDEX idx_admin_logicas_modulo ON public.admin_logicas(modulo);
CREATE INDEX idx_admin_logicas_versao ON public.admin_logicas(modulo, nome_logica, versao);

-- Habilitar RLS
ALTER TABLE public.admin_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logicas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem acessar
CREATE POLICY "Admins podem ver prompts" 
ON public.admin_prompts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

CREATE POLICY "Admins podem criar prompts" 
ON public.admin_prompts 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

CREATE POLICY "Admins podem editar prompts" 
ON public.admin_prompts 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

CREATE POLICY "Admins podem deletar prompts" 
ON public.admin_prompts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

CREATE POLICY "Admins podem ver logicas" 
ON public.admin_logicas 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

CREATE POLICY "Admins podem criar logicas" 
ON public.admin_logicas 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

CREATE POLICY "Admins podem editar logicas" 
ON public.admin_logicas 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

CREATE POLICY "Admins podem deletar logicas" 
ON public.admin_logicas 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_admin_prompts_updated_at
BEFORE UPDATE ON public.admin_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_logicas_updated_at
BEFORE UPDATE ON public.admin_logicas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();