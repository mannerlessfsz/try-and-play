
CREATE TABLE public.casa_planos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  classificacao TEXT,
  cnpj TEXT DEFAULT '00000000000000',
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.casa_planos_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view casa plano of their empresas"
  ON public.casa_planos_empresa FOR SELECT TO authenticated
  USING (public.has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert casa plano for their empresas"
  ON public.casa_planos_empresa FOR INSERT TO authenticated
  WITH CHECK (public.has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can update casa plano of their empresas"
  ON public.casa_planos_empresa FOR UPDATE TO authenticated
  USING (public.has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can delete casa plano of their empresas"
  ON public.casa_planos_empresa FOR DELETE TO authenticated
  USING (public.has_empresa_access(auth.uid(), empresa_id));

-- Add column to empresas table for the file name
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS casa_plano_contas_arquivo TEXT;

CREATE INDEX idx_casa_planos_empresa_empresa ON public.casa_planos_empresa(empresa_id);
