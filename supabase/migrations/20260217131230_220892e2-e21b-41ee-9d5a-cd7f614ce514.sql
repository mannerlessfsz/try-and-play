
-- Adicionar flags is_banco e is_aplicacao na tabela de plano empresa
ALTER TABLE public.apae_planos_empresa
  ADD COLUMN IF NOT EXISTS is_banco boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_aplicacao boolean DEFAULT false;

-- Criar tabela de mapeamento banco→aplicações no nível da empresa
CREATE TABLE IF NOT EXISTS public.apae_banco_aplicacoes_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  banco_codigo TEXT NOT NULL,
  aplicacao1_codigo TEXT DEFAULT NULL,
  aplicacao2_codigo TEXT DEFAULT NULL,
  aplicacao3_codigo TEXT DEFAULT NULL,
  aplicacao4_codigo TEXT DEFAULT NULL,
  aplicacao5_codigo TEXT DEFAULT NULL,
  nome_relatorio TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apae_banco_aplicacoes_empresa ENABLE ROW LEVEL SECURITY;

-- RLS policies - mesmo padrão das outras tabelas APAE
CREATE POLICY "Users can view apae_banco_aplicacoes_empresa"
  ON public.apae_banco_aplicacoes_empresa
  FOR SELECT USING (true);

CREATE POLICY "Users can insert apae_banco_aplicacoes_empresa"
  ON public.apae_banco_aplicacoes_empresa
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update apae_banco_aplicacoes_empresa"
  ON public.apae_banco_aplicacoes_empresa
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete apae_banco_aplicacoes_empresa"
  ON public.apae_banco_aplicacoes_empresa
  FOR DELETE USING (true);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_apae_banco_aplicacoes_empresa_empresa_id
  ON public.apae_banco_aplicacoes_empresa(empresa_id);
