ALTER TABLE public.eq_resultado_periodo 
ADD COLUMN IF NOT EXISTS lucro_exercicio NUMERIC(18,2) DEFAULT 0;