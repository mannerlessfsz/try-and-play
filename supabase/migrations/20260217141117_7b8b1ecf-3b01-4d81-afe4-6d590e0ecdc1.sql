
-- Add tipo column to apae_sessoes
ALTER TABLE public.apae_sessoes 
ADD COLUMN tipo text NOT NULL DEFAULT 'contas_a_pagar';

-- Update existing sessions
UPDATE public.apae_sessoes SET tipo = 'contas_a_pagar' WHERE tipo = 'contas_a_pagar';

-- Add comment
COMMENT ON COLUMN public.apae_sessoes.tipo IS 'Tipo da sessão: contas_a_pagar ou movimento_caixa';
