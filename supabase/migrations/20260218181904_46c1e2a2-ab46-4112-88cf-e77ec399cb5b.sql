
-- Tabela para persistir saldo remanescente por guia/nota em cada competência
CREATE TABLE public.controle_saldos_notas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  guia_id TEXT NOT NULL,
  numero_nota TEXT NOT NULL,
  competencia_ano INTEGER NOT NULL,
  competencia_mes INTEGER NOT NULL,
  saldo_remanescente NUMERIC(15,3) NOT NULL DEFAULT 0,
  quantidade_original NUMERIC(15,3) NOT NULL DEFAULT 0,
  quantidade_consumida NUMERIC(15,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, guia_id, competencia_ano, competencia_mes)
);

-- RLS
ALTER TABLE public.controle_saldos_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários com acesso à empresa podem ver saldos"
  ON public.controle_saldos_notas FOR SELECT
  USING (public.user_has_empresa_access(empresa_id));

CREATE POLICY "Usuários com acesso à empresa podem inserir saldos"
  ON public.controle_saldos_notas FOR INSERT
  WITH CHECK (public.user_has_empresa_access(empresa_id));

CREATE POLICY "Usuários com acesso à empresa podem atualizar saldos"
  ON public.controle_saldos_notas FOR UPDATE
  USING (public.user_has_empresa_access(empresa_id));

CREATE POLICY "Usuários com acesso à empresa podem deletar saldos"
  ON public.controle_saldos_notas FOR DELETE
  USING (public.user_has_empresa_access(empresa_id));

-- Trigger para updated_at
CREATE TRIGGER update_controle_saldos_notas_updated_at
  BEFORE UPDATE ON public.controle_saldos_notas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index para busca rápida por empresa e competência anterior
CREATE INDEX idx_controle_saldos_notas_empresa_comp 
  ON public.controle_saldos_notas(empresa_id, competencia_ano, competencia_mes);
