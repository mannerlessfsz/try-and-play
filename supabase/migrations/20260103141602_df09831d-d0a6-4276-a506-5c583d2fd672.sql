-- Adicionar campo para identificar transações criadas a partir de extrato
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS origem_extrato boolean DEFAULT false;

-- Adicionar campo para vincular à importação de origem
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS importacao_extrato_id uuid REFERENCES public.importacoes_extrato(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_transacoes_origem_extrato ON public.transacoes(origem_extrato);
CREATE INDEX IF NOT EXISTS idx_transacoes_importacao_extrato_id ON public.transacoes(importacao_extrato_id);