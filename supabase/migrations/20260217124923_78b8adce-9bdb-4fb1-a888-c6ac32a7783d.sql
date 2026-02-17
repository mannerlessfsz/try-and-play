
-- Tabela para plano de contas persistente por empresa
CREATE TABLE public.apae_planos_empresa (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  descricao text NOT NULL,
  classificacao text,
  cnpj text DEFAULT '00000000000000',
  ordem integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Coluna para nome do arquivo do plano na empresa
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS apae_plano_contas_arquivo text;

-- RLS
ALTER TABLE public.apae_planos_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon apae_planos_empresa"
  ON public.apae_planos_empresa FOR SELECT
  USING (false);

CREATE POLICY "Users can manage apae_planos_empresa"
  ON public.apae_planos_empresa FOR ALL
  USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

-- Index
CREATE INDEX idx_apae_planos_empresa_empresa ON public.apae_planos_empresa(empresa_id);
