
-- Tabela para Guias de Pagamentos do Ajusta SPED
CREATE TABLE public.guias_pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero_nota TEXT NOT NULL,
  valor_guia NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_nota DATE NULL,
  data_pagamento DATE NULL,
  numero_doc_pagamento TEXT NULL,
  codigo_barras TEXT NULL,
  produto TEXT NULL,
  credito_icms_proprio TEXT NULL,
  credito_icms_st TEXT NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guias_pagamentos ENABLE ROW LEVEL SECURITY;

-- RLS policies - same pattern as notas_entrada_st
CREATE POLICY "Users can view guias_pagamentos of their empresas"
  ON public.guias_pagamentos FOR SELECT
  USING (public.has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert guias_pagamentos for their empresas"
  ON public.guias_pagamentos FOR INSERT
  WITH CHECK (public.has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can update guias_pagamentos of their empresas"
  ON public.guias_pagamentos FOR UPDATE
  USING (public.has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can delete guias_pagamentos of their empresas"
  ON public.guias_pagamentos FOR DELETE
  USING (public.has_empresa_access(auth.uid(), empresa_id));

-- Auto-update updated_at
CREATE TRIGGER update_guias_pagamentos_updated_at
  BEFORE UPDATE ON public.guias_pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_guias_pagamentos_empresa_id ON public.guias_pagamentos(empresa_id);
CREATE INDEX idx_guias_pagamentos_data_pagamento ON public.guias_pagamentos(data_pagamento);
