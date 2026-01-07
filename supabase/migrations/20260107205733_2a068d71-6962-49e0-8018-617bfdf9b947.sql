
-- Adicionar coluna ativo em empresas
ALTER TABLE public.empresas ADD COLUMN ativo boolean DEFAULT true NOT NULL;
