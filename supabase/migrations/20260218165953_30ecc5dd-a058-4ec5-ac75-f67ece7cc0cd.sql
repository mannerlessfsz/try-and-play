
-- Tabela para controle de créditos ICMS-ST por competência
CREATE TABLE public.controle_creditos_icms_st (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  competencia_mes INTEGER NOT NULL CHECK (competencia_mes BETWEEN 1 AND 12),
  competencia_ano INTEGER NOT NULL CHECK (competencia_ano >= 2020),
  saldo_anterior NUMERIC(15,2) NOT NULL DEFAULT 0,
  credito_periodo NUMERIC(15,2) NOT NULL DEFAULT 0,
  utilizado_periodo NUMERIC(15,2) NOT NULL DEFAULT 0,
  estornado_periodo NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_final NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_guias INTEGER NOT NULL DEFAULT 0,
  guias_utilizaveis INTEGER NOT NULL DEFAULT 0,
  guias_utilizadas INTEGER NOT NULL DEFAULT 0,
  guias_nao_pagas INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'conferido', 'fechado')),
  observacoes TEXT,
  conferido_por TEXT,
  conferido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, competencia_mes, competencia_ano)
);

-- Tabela de detalhes: vínculo entre competência e guias individuais
CREATE TABLE public.controle_creditos_guias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  controle_id UUID NOT NULL REFERENCES public.controle_creditos_icms_st(id) ON DELETE CASCADE,
  guia_id UUID NOT NULL,
  numero_nota TEXT NOT NULL,
  valor_guia NUMERIC(15,2) NOT NULL DEFAULT 0,
  credito_icms_st NUMERIC(15,2) NOT NULL DEFAULT 0,
  credito_icms_proprio NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_utilizado NUMERIC(15,2) NOT NULL DEFAULT 0,
  status_guia TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.controle_creditos_icms_st ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_creditos_guias ENABLE ROW LEVEL SECURITY;

-- Policies - controle_creditos_icms_st (admin-only or empresa access)
CREATE POLICY "Admin full access controle_creditos"
  ON public.controle_creditos_icms_st
  FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users view own empresa controle"
  ON public.controle_creditos_icms_st
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Policies - controle_creditos_guias
CREATE POLICY "Admin full access controle_guias"
  ON public.controle_creditos_guias
  FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users view controle_guias"
  ON public.controle_creditos_guias
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_controle_creditos_updated_at
  BEFORE UPDATE ON public.controle_creditos_icms_st
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_controle_creditos_empresa_comp ON public.controle_creditos_icms_st(empresa_id, competencia_ano, competencia_mes);
CREATE INDEX idx_controle_guias_controle_id ON public.controle_creditos_guias(controle_id);
