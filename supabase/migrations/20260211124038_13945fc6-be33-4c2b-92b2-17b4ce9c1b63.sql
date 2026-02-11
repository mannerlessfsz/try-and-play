
-- Sessões do wizard APAE (cada processamento é uma sessão)
CREATE TABLE public.apae_sessoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  passo_atual INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  nome_sessao TEXT,
  plano_contas_arquivo TEXT,
  relatorio_arquivo TEXT,
  metadados JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contas do plano de contas parseado vinculadas à sessão
CREATE TABLE public.apae_plano_contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES public.apae_sessoes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  classificacao TEXT,
  is_banco BOOLEAN DEFAULT false,
  is_aplicacao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Linhas do relatório original (dados brutos importados)
CREATE TABLE public.apae_relatorio_linhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES public.apae_sessoes(id) ON DELETE CASCADE,
  linha_numero INTEGER NOT NULL,
  tipo_linha TEXT NOT NULL DEFAULT 'dados', -- 'dados' ou 'historico'
  par_id INTEGER, -- agrupa linhas ímpares/pares
  col_a TEXT, -- SITUAÇÃO
  col_b TEXT, -- FORNECEDOR / HISTÓRICO
  col_c TEXT, -- CONTA DÉBITO
  col_d TEXT, -- CENTRO DE CUSTO
  col_e TEXT, -- N° DOC
  col_f TEXT, -- VENCIMENTO
  col_g TEXT, -- VALOR
  col_h TEXT, -- DATA PAGTO
  col_i TEXT, -- VALOR PAGO
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resultados processados (passo 4/5)
CREATE TABLE public.apae_resultados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES public.apae_sessoes(id) ON DELETE CASCADE,
  par_id INTEGER NOT NULL,
  fornecedor TEXT,
  conta_debito TEXT,
  conta_debito_codigo TEXT,
  centro_custo TEXT,
  n_doc TEXT,
  vencimento TEXT,
  valor TEXT,
  data_pagto TEXT,
  valor_pago TEXT,
  historico_original TEXT,
  historico_concatenado TEXT,
  conta_credito_codigo TEXT,
  status TEXT DEFAULT 'pendente', -- pendente, vinculado, erro
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_apae_plano_sessao ON public.apae_plano_contas(sessao_id);
CREATE INDEX idx_apae_relatorio_sessao ON public.apae_relatorio_linhas(sessao_id);
CREATE INDEX idx_apae_resultados_sessao ON public.apae_resultados(sessao_id);
CREATE INDEX idx_apae_sessoes_empresa ON public.apae_sessoes(empresa_id);

-- RLS
ALTER TABLE public.apae_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apae_plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apae_relatorio_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apae_resultados ENABLE ROW LEVEL SECURITY;

-- Políticas para apae_sessoes
CREATE POLICY "Users can view apae_sessoes of their empresas"
  ON public.apae_sessoes FOR SELECT
  USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can create apae_sessoes in their empresas"
  ON public.apae_sessoes FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can update apae_sessoes in their empresas"
  ON public.apae_sessoes FOR UPDATE
  USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can delete apae_sessoes in their empresas"
  ON public.apae_sessoes FOR DELETE
  USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

-- Políticas para tabelas filhas (via sessão)
CREATE POLICY "Users can manage apae_plano_contas via sessao"
  ON public.apae_plano_contas FOR ALL
  USING (EXISTS (SELECT 1 FROM apae_sessoes s WHERE s.id = sessao_id AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), s.empresa_id))));

CREATE POLICY "Users can manage apae_relatorio_linhas via sessao"
  ON public.apae_relatorio_linhas FOR ALL
  USING (EXISTS (SELECT 1 FROM apae_sessoes s WHERE s.id = sessao_id AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), s.empresa_id))));

CREATE POLICY "Users can manage apae_resultados via sessao"
  ON public.apae_resultados FOR ALL
  USING (EXISTS (SELECT 1 FROM apae_sessoes s WHERE s.id = sessao_id AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), s.empresa_id))));

-- Deny anon
CREATE POLICY "Deny anon apae_sessoes" ON public.apae_sessoes FOR SELECT USING (false);
CREATE POLICY "Deny anon apae_plano_contas" ON public.apae_plano_contas FOR SELECT USING (false);
CREATE POLICY "Deny anon apae_relatorio_linhas" ON public.apae_relatorio_linhas FOR SELECT USING (false);
CREATE POLICY "Deny anon apae_resultados" ON public.apae_resultados FOR SELECT USING (false);

-- Trigger para updated_at
CREATE TRIGGER update_apae_sessoes_updated_at
  BEFORE UPDATE ON public.apae_sessoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
