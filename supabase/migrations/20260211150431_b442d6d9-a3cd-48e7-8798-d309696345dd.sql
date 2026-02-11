
ALTER TABLE public.apae_banco_aplicacoes
ADD COLUMN nome_relatorio text DEFAULT NULL;

COMMENT ON COLUMN public.apae_banco_aplicacoes.nome_relatorio IS 'Como esta conta de banco aparece no relatório, ex: APAE GRAMADO CER II - 37.493-8';
