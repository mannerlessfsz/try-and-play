-- Drop existing FK that references empresas
ALTER TABLE public.regras_exclusao_lider
  DROP CONSTRAINT regras_exclusao_lider_empresa_id_fkey;

-- Add new FK that references empresas_externas_conversores
ALTER TABLE public.regras_exclusao_lider
  ADD CONSTRAINT regras_exclusao_lider_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas_externas_conversores(id);