ALTER TABLE public.notas_entrada_st
  ADD COLUMN IF NOT EXISTS cod_fornecedor text,
  ADD COLUMN IF NOT EXISTS serie text,
  ADD COLUMN IF NOT EXISTS subserie text;