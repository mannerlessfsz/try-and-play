-- Criar tabela para regras de exclusão do conversor Lider
CREATE TABLE public.regras_exclusao_lider (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conta_debito TEXT DEFAULT '',
  conta_credito TEXT DEFAULT '',
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.regras_exclusao_lider ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view regras of their empresas"
ON public.regras_exclusao_lider
FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert regras in their empresas"
ON public.regras_exclusao_lider
FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can update regras in their empresas"
ON public.regras_exclusao_lider
FOR UPDATE
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can delete regras in their empresas"
ON public.regras_exclusao_lider
FOR DELETE
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

-- Trigger para updated_at
CREATE TRIGGER update_regras_exclusao_lider_updated_at
BEFORE UPDATE ON public.regras_exclusao_lider
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para performance
CREATE INDEX idx_regras_exclusao_lider_empresa ON public.regras_exclusao_lider(empresa_id);