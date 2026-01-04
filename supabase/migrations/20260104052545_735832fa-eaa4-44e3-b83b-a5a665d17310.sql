-- Adicionar novos campos à tabela tarefas
ALTER TABLE public.tarefas
ADD COLUMN IF NOT EXISTS prazo_entrega DATE,
ADD COLUMN IF NOT EXISTS requer_anexo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa TEXT,
ADD COLUMN IF NOT EXISTS envio_automatico BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_envio_automatico DATE;