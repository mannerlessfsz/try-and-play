
-- Grupos Econômicos
CREATE TABLE public.grupos_economicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cnpj_holding TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grupos_economicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage grupos_economicos"
  ON public.grupos_economicos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Investidas dentro de um grupo
CREATE TABLE public.grupo_investidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos_economicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  percentual_participacao NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grupo_investidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage grupo_investidas"
  ON public.grupo_investidas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Balanços importados por investida
CREATE TABLE public.grupo_balancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investida_id UUID NOT NULL REFERENCES public.grupo_investidas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  patrimonio_liquido NUMERIC(18,2) NOT NULL DEFAULT 0,
  ativo_total NUMERIC(18,2) DEFAULT 0,
  passivo_total NUMERIC(18,2) DEFAULT 0,
  capital_social NUMERIC(18,2) DEFAULT 0,
  reservas NUMERIC(18,2) DEFAULT 0,
  lucros_prejuizos NUMERIC(18,2) DEFAULT 0,
  arquivo_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grupo_balancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage grupo_balancos"
  ON public.grupo_balancos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Updated at triggers
CREATE TRIGGER update_grupos_economicos_updated_at BEFORE UPDATE ON public.grupos_economicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grupo_investidas_updated_at BEFORE UPDATE ON public.grupo_investidas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
