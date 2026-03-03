
-- Table to store competência sessions per economic group
CREATE TABLE public.eq_competencia_sessoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.grupos_economicos(id) ON DELETE CASCADE,
  competencia_mes INTEGER NOT NULL CHECK (competencia_mes BETWEEN 1 AND 12),
  competencia_ano INTEGER NOT NULL CHECK (competencia_ano BETWEEN 2000 AND 2100),
  periodo TEXT GENERATED ALWAYS AS (competencia_ano::text || '-' || LPAD(competencia_mes::text, 2, '0')) STORED,
  status TEXT NOT NULL DEFAULT 'aberta',
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grupo_id, competencia_mes, competencia_ano)
);

-- Enable RLS
ALTER TABLE public.eq_competencia_sessoes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can manage eq_competencia_sessoes"
  ON public.eq_competencia_sessoes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_eq_competencia_sessoes_updated_at
  BEFORE UPDATE ON public.eq_competencia_sessoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
