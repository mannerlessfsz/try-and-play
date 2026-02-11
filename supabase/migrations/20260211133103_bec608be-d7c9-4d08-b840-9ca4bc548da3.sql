
CREATE TABLE public.apae_banco_aplicacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES public.apae_sessoes(id) ON DELETE CASCADE,
  banco_codigo TEXT NOT NULL,
  aplicacao1_codigo TEXT DEFAULT '0',
  aplicacao2_codigo TEXT DEFAULT '0',
  aplicacao3_codigo TEXT DEFAULT '0',
  aplicacao4_codigo TEXT DEFAULT '0',
  aplicacao5_codigo TEXT DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.apae_banco_aplicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view banco_aplicacoes via sessao access"
  ON public.apae_banco_aplicacoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.apae_sessoes s
    JOIN public.empresas e ON e.id = s.empresa_id
    WHERE s.id = sessao_id
    AND public.user_in_empresa(e.id)
  ));

CREATE POLICY "Users can insert banco_aplicacoes via sessao access"
  ON public.apae_banco_aplicacoes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.apae_sessoes s
    JOIN public.empresas e ON e.id = s.empresa_id
    WHERE s.id = sessao_id
    AND public.user_in_empresa(e.id)
  ));

CREATE POLICY "Users can update banco_aplicacoes via sessao access"
  ON public.apae_banco_aplicacoes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.apae_sessoes s
    JOIN public.empresas e ON e.id = s.empresa_id
    WHERE s.id = sessao_id
    AND public.user_in_empresa(e.id)
  ));

CREATE POLICY "Users can delete banco_aplicacoes via sessao access"
  ON public.apae_banco_aplicacoes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.apae_sessoes s
    JOIN public.empresas e ON e.id = s.empresa_id
    WHERE s.id = sessao_id
    AND public.user_in_empresa(e.id)
  ));

CREATE INDEX idx_apae_banco_aplicacoes_sessao ON public.apae_banco_aplicacoes(sessao_id);
