
CREATE TABLE public.grupo_investidas_socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investida_id UUID NOT NULL REFERENCES public.grupo_investidas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  qualificacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grupo_investidas_socios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage socios"
  ON public.grupo_investidas_socios
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_grupo_investidas_socios_investida ON public.grupo_investidas_socios(investida_id);
CREATE INDEX idx_grupo_investidas_socios_cpf_cnpj ON public.grupo_investidas_socios(cpf_cnpj);
