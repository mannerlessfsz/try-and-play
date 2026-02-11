
-- Table to store parsed Razão Contábil lines
CREATE TABLE public.apae_razao_linhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES public.apae_sessoes(id) ON DELETE CASCADE,
  conta_codigo TEXT NOT NULL,
  conta_descricao TEXT,
  data TEXT,
  historico TEXT,
  cta_c_part TEXT,
  debito TEXT,
  credito TEXT,
  saldo TEXT,
  linha_numero INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_apae_razao_sessao ON public.apae_razao_linhas(sessao_id);

ALTER TABLE public.apae_razao_linhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon apae_razao_linhas"
ON public.apae_razao_linhas
FOR SELECT
USING (false);

CREATE POLICY "Users can manage apae_razao_linhas via sessao"
ON public.apae_razao_linhas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM apae_sessoes s
    WHERE s.id = apae_razao_linhas.sessao_id
    AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), s.empresa_id))
  )
);
