
-- ============================================================
-- MODELO COMPLETO: EQUIVALÊNCIA PATRIMONIAL (MOTOR MATRICIAL)
-- ============================================================

-- Sócios (PF/PJ externos ao grupo)
CREATE TABLE public.eq_socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos_economicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_socio TEXT NOT NULL DEFAULT 'PF' CHECK (tipo_socio IN ('PF', 'PJ')),
  cpf_cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eq_socios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_eq_socios" ON public.eq_socios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tipo empresa na investida
ALTER TABLE public.grupo_investidas ADD COLUMN IF NOT EXISTS tipo_empresa TEXT DEFAULT 'operacional' CHECK (tipo_empresa IN ('operacional', 'holding', 'mista'));
ALTER TABLE public.grupo_investidas ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT true;

-- Participações Cruzadas (empresa investe em empresa)
CREATE TABLE public.eq_participacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos_economicos(id) ON DELETE CASCADE,
  id_investidora UUID NOT NULL REFERENCES public.grupo_investidas(id) ON DELETE CASCADE,
  id_investida UUID NOT NULL REFERENCES public.grupo_investidas(id) ON DELETE CASCADE,
  percentual NUMERIC(10,6) NOT NULL,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_no_self_investment CHECK (id_investidora <> id_investida),
  CONSTRAINT chk_percentual_range CHECK (percentual > 0 AND percentual <= 100)
);

ALTER TABLE public.eq_participacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_eq_participacoes" ON public.eq_participacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Participações de Sócios Externos em Empresas
CREATE TABLE public.eq_participacoes_socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.grupo_investidas(id) ON DELETE CASCADE,
  id_socio UUID NOT NULL REFERENCES public.eq_socios(id) ON DELETE CASCADE,
  percentual NUMERIC(10,6) NOT NULL,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_perc_socio_range CHECK (percentual > 0 AND percentual <= 100)
);

ALTER TABLE public.eq_participacoes_socios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_eq_part_socios" ON public.eq_participacoes_socios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Resultado do Período (lucro pré-equivalência por empresa)
CREATE TABLE public.eq_resultado_periodo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.grupo_investidas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL, -- YYYY-MM
  lucro_pre_equivalencia NUMERIC(18,2) NOT NULL DEFAULT 0,
  dividendos_declarados NUMERIC(18,2) NOT NULL DEFAULT 0,
  data_fechamento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_empresa, periodo)
);

ALTER TABLE public.eq_resultado_periodo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_eq_resultado" ON public.eq_resultado_periodo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PL Snapshot (foto do PL por período)
CREATE TABLE public.eq_pl_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.grupo_investidas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL, -- YYYY-MM
  pl_abertura NUMERIC(18,2) NOT NULL DEFAULT 0,
  ajuste_equivalencia NUMERIC(18,2) NOT NULL DEFAULT 0,
  pl_fechamento NUMERIC(18,2) NOT NULL DEFAULT 0,
  processado BOOLEAN NOT NULL DEFAULT false,
  data_processamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_empresa, periodo)
);

ALTER TABLE public.eq_pl_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_eq_pl" ON public.eq_pl_snapshot FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lançamentos de Equivalência gerados
CREATE TABLE public.eq_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa UUID NOT NULL REFERENCES public.grupo_investidas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  valor_equivalencia NUMERIC(18,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  data_geracao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eq_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_eq_lancamentos" ON public.eq_lancamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cache da matriz de participação
CREATE TABLE public.eq_matriz_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos_economicos(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  matriz_json JSONB NOT NULL,
  resultado_json JSONB,
  data_calculo TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grupo_id, periodo)
);

ALTER TABLE public.eq_matriz_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_eq_cache" ON public.eq_matriz_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
