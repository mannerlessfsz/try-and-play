
-- Tabela de modelos de documentos (templates de referência)
CREATE TABLE public.documento_modelos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  palavras_chave TEXT[] NOT NULL DEFAULT '{}',
  tipo_documento TEXT NOT NULL DEFAULT 'geral',
  departamento TEXT,
  arquivo_modelo_url TEXT,
  arquivo_modelo_nome TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documento_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active documento_modelos"
  ON public.documento_modelos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert documento_modelos"
  ON public.documento_modelos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update documento_modelos"
  ON public.documento_modelos FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete documento_modelos"
  ON public.documento_modelos FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_documento_modelos_updated_at
  BEFORE UPDATE ON public.documento_modelos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de vínculo: quais documentos são obrigatórios por tarefa_modelo
CREATE TABLE public.tarefa_documentos_obrigatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_modelo_id UUID NOT NULL REFERENCES public.tarefas_modelo(id) ON DELETE CASCADE,
  documento_modelo_id UUID NOT NULL REFERENCES public.documento_modelos(id) ON DELETE CASCADE,
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tarefa_modelo_id, documento_modelo_id)
);

ALTER TABLE public.tarefa_documentos_obrigatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tarefa_documentos_obrigatorios"
  ON public.tarefa_documentos_obrigatorios FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tarefa_documentos_obrigatorios"
  ON public.tarefa_documentos_obrigatorios FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Tabela de validações: resultado da comparação quando um arquivo é enviado
CREATE TABLE public.tarefa_documento_validacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  tarefa_arquivo_id UUID NOT NULL REFERENCES public.tarefa_arquivos(id) ON DELETE CASCADE,
  documento_modelo_id UUID NOT NULL REFERENCES public.documento_modelos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'valido', 'incompleto', 'invalido')),
  palavras_encontradas TEXT[] DEFAULT '{}',
  palavras_faltantes TEXT[] DEFAULT '{}',
  percentual_match NUMERIC(5,2) DEFAULT 0,
  texto_extraido TEXT,
  validado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefa_documento_validacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view validacoes"
  ON public.tarefa_documento_validacoes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert validacoes"
  ON public.tarefa_documento_validacoes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update validacoes"
  ON public.tarefa_documento_validacoes FOR UPDATE TO authenticated
  USING (true);
