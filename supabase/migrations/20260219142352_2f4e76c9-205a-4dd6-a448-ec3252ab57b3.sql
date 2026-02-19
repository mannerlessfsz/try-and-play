
-- Add new columns to support two rule types: revisao and alteracao
ALTER TABLE public.regras_exclusao_lider
  ADD COLUMN tipo text NOT NULL DEFAULT 'revisao',
  ADD COLUMN historico_busca text DEFAULT '',
  ADD COLUMN novo_debito text DEFAULT '',
  ADD COLUMN novo_credito text DEFAULT '';

-- Add constraint for valid tipo values
ALTER TABLE public.regras_exclusao_lider
  ADD CONSTRAINT regras_exclusao_lider_tipo_check CHECK (tipo IN ('revisao', 'alteracao'));

-- Comment on columns
COMMENT ON COLUMN public.regras_exclusao_lider.tipo IS 'revisao = flags for user review, alteracao = auto-modifies entries';
COMMENT ON COLUMN public.regras_exclusao_lider.historico_busca IS 'Partial or full match on historico/description field';
COMMENT ON COLUMN public.regras_exclusao_lider.novo_debito IS 'New debit account (for alteracao type)';
COMMENT ON COLUMN public.regras_exclusao_lider.novo_credito IS 'New credit account (for alteracao type)';
