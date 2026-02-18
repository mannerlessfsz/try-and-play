
-- Table for Notas Entrada ST (Step 1 of Ajusta SPED pipeline)
CREATE TABLE public.notas_entrada_st (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_by UUID,
  
  -- Invoice data
  nfe TEXT NOT NULL,
  fornecedor TEXT NOT NULL,
  competencia DATE,
  ncm TEXT,
  quantidade NUMERIC DEFAULT 0,
  valor_produto NUMERIC DEFAULT 0,
  ipi NUMERIC DEFAULT 0,
  frete NUMERIC DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  
  -- Tax rates
  pct_mva NUMERIC DEFAULT 0,
  pct_icms_interno NUMERIC DEFAULT 0,
  pct_fecp NUMERIC DEFAULT 0,
  pct_icms_interestadual NUMERIC DEFAULT 0,
  
  -- Calculated/stored tax values
  bc_icms_st NUMERIC DEFAULT 0,
  valor_icms_nf NUMERIC DEFAULT 0,
  valor_icms_st NUMERIC DEFAULT 0,
  valor_fecp NUMERIC DEFAULT 0,
  valor_st_un NUMERIC DEFAULT 0,
  total_st NUMERIC DEFAULT 0,
  
  -- Payment
  data_pagamento DATE,
  observacoes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notas_entrada_st ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view notas_entrada_st for their empresas"
  ON public.notas_entrada_st FOR SELECT
  USING (
    empresa_id IN (
      SELECT e.id FROM public.empresas e
      INNER JOIN public.empresa_modulos em ON em.empresa_id = e.id
      WHERE em.ativo = true
    )
  );

CREATE POLICY "Users can insert notas_entrada_st"
  ON public.notas_entrada_st FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT e.id FROM public.empresas e
      INNER JOIN public.empresa_modulos em ON em.empresa_id = e.id
      WHERE em.ativo = true
    )
  );

CREATE POLICY "Users can update notas_entrada_st"
  ON public.notas_entrada_st FOR UPDATE
  USING (
    empresa_id IN (
      SELECT e.id FROM public.empresas e
      INNER JOIN public.empresa_modulos em ON em.empresa_id = e.id
      WHERE em.ativo = true
    )
  );

CREATE POLICY "Users can delete notas_entrada_st"
  ON public.notas_entrada_st FOR DELETE
  USING (
    empresa_id IN (
      SELECT e.id FROM public.empresas e
      INNER JOIN public.empresa_modulos em ON em.empresa_id = e.id
      WHERE em.ativo = true
    )
  );

-- Timestamp trigger
CREATE TRIGGER update_notas_entrada_st_updated_at
  BEFORE UPDATE ON public.notas_entrada_st
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_notas_entrada_st_empresa ON public.notas_entrada_st(empresa_id);
CREATE INDEX idx_notas_entrada_st_competencia ON public.notas_entrada_st(competencia);
