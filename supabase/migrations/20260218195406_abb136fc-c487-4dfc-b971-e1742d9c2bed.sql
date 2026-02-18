
-- Add columns from guias_pagamentos that don't exist in notas_entrada_st
ALTER TABLE public.notas_entrada_st
  ADD COLUMN IF NOT EXISTS numero_doc_pagamento text,
  ADD COLUMN IF NOT EXISTS codigo_barras text,
  ADD COLUMN IF NOT EXISTS produto text,
  ADD COLUMN IF NOT EXISTS credito_icms_proprio text,
  ADD COLUMN IF NOT EXISTS credito_icms_st text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'UTILIZAVEL';
