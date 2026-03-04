
-- Add regime_tributario column to empresas_externas_conversores
ALTER TABLE public.empresas_externas_conversores 
ADD COLUMN IF NOT EXISTS regime_tributario text DEFAULT NULL;

-- Add columns to regras_retencao_servico for regime-aware validation
ALTER TABLE public.regras_retencao_servico 
ADD COLUMN IF NOT EXISTS dispensa_simples_prestador boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS dispensa_mei boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS valor_minimo_ir numeric DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS valor_minimo_pcc numeric DEFAULT 5000.00,
ADD COLUMN IF NOT EXISTS observacoes text DEFAULT NULL;

-- Update existing rules with correct minimum values
UPDATE public.regras_retencao_servico 
SET valor_minimo_ir = 10.00, valor_minimo_pcc = 5000.00, dispensa_simples_prestador = true, dispensa_mei = true;
