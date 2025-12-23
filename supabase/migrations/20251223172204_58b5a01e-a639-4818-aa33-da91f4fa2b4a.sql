-- =====================================================
-- BPO FINANCEIRO COMPLETO - INFRAESTRUTURA
-- =====================================================

-- 1. AJUSTAR RLS DE CONTAS_BANCARIAS (permitir que usuários da empresa gerenciem)
-- Remover policy restritiva de admins only
DROP POLICY IF EXISTS "Only admins can manage contas_bancarias" ON public.contas_bancarias;

-- Criar políticas para usuários da empresa
CREATE POLICY "Users can insert contas_bancarias in their empresas"
ON public.contas_bancarias FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'create'::permission_type))
);

CREATE POLICY "Users can update contas_bancarias in their empresas"
ON public.contas_bancarias FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'edit'::permission_type))
);

CREATE POLICY "Users can delete contas_bancarias in their empresas"
ON public.contas_bancarias FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'delete'::permission_type))
);

-- Adicionar coluna de saldo inicial na contas_bancarias
ALTER TABLE public.contas_bancarias 
ADD COLUMN IF NOT EXISTS saldo_inicial numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cor text DEFAULT '#3b82f6';

-- =====================================================
-- 2. CATEGORIAS FINANCEIRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categorias_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa', 'ambos')),
  cor text DEFAULT '#6b7280',
  icone text DEFAULT 'tag',
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, nome)
);

ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categorias of their empresas"
ON public.categorias_financeiras FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert categorias in their empresas"
ON public.categorias_financeiras FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'create'::permission_type))
);

CREATE POLICY "Users can update categorias in their empresas"
ON public.categorias_financeiras FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'edit'::permission_type))
);

CREATE POLICY "Users can delete categorias in their empresas"
ON public.categorias_financeiras FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'delete'::permission_type))
);

-- =====================================================
-- 3. CENTRO DE CUSTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, nome)
);

ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view centros_custo of their empresas"
ON public.centros_custo FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert centros_custo in their empresas"
ON public.centros_custo FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'create'::permission_type))
);

CREATE POLICY "Users can update centros_custo in their empresas"
ON public.centros_custo FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'edit'::permission_type))
);

CREATE POLICY "Users can delete centros_custo in their empresas"
ON public.centros_custo FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'delete'::permission_type))
);

-- =====================================================
-- 4. TRANSAÇÕES FINANCEIRAS (principal)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conta_bancaria_id uuid REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  descricao text NOT NULL,
  valor numeric(15,2) NOT NULL,
  data_transacao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date,
  data_pagamento date,
  
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
  forma_pagamento text,
  numero_documento text,
  observacoes text,
  
  -- Para transferências
  conta_destino_id uuid REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  
  -- Para parcelamentos
  parcelamento_id uuid,
  parcela_numero integer,
  parcela_total integer,
  
  -- Para recorrências
  recorrencia_id uuid,
  
  -- Conciliação
  conciliado boolean DEFAULT false,
  data_conciliacao timestamptz,
  
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transacoes of their empresas"
ON public.transacoes FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert transacoes in their empresas"
ON public.transacoes FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'create'::permission_type))
);

CREATE POLICY "Users can update transacoes in their empresas"
ON public.transacoes FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'edit'::permission_type))
);

CREATE POLICY "Users can delete transacoes in their empresas"
ON public.transacoes FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'delete'::permission_type))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_empresa ON public.transacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_conta ON public.transacoes(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON public.transacoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON public.transacoes(data_transacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON public.transacoes(status);

-- =====================================================
-- 5. RECORRÊNCIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conta_bancaria_id uuid REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  descricao text NOT NULL,
  valor numeric(15,2) NOT NULL,
  
  frequencia text NOT NULL CHECK (frequencia IN ('diario', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  dia_vencimento integer, -- dia do mês para recorrências mensais
  dia_semana integer, -- 0-6 para recorrências semanais
  
  data_inicio date NOT NULL,
  data_fim date, -- null = sem fim
  proxima_geracao date NOT NULL,
  
  ativo boolean DEFAULT true,
  gerar_automatico boolean DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recorrencias of their empresas"
ON public.recorrencias FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert recorrencias in their empresas"
ON public.recorrencias FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'create'::permission_type))
);

CREATE POLICY "Users can update recorrencias in their empresas"
ON public.recorrencias FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'edit'::permission_type))
);

CREATE POLICY "Users can delete recorrencias in their empresas"
ON public.recorrencias FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'delete'::permission_type))
);

-- =====================================================
-- 6. ORÇAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.categorias_financeiras(id) ON DELETE CASCADE,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  valor_planejado numeric(15,2) NOT NULL DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(empresa_id, categoria_id, centro_custo_id, ano, mes)
);

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orcamentos of their empresas"
ON public.orcamentos FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert orcamentos in their empresas"
ON public.orcamentos FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'create'::permission_type))
);

CREATE POLICY "Users can update orcamentos in their empresas"
ON public.orcamentos FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'edit'::permission_type))
);

CREATE POLICY "Users can delete orcamentos in their empresas"
ON public.orcamentos FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'delete'::permission_type))
);

-- =====================================================
-- 7. METAS FINANCEIRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.metas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN ('economia', 'faturamento', 'reducao_custo', 'investimento', 'outro')),
  
  valor_meta numeric(15,2) NOT NULL,
  valor_atual numeric(15,2) DEFAULT 0,
  
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  
  categoria_id uuid REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  
  ativo boolean DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metas of their empresas"
ON public.metas_financeiras FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert metas in their empresas"
ON public.metas_financeiras FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'create'::permission_type))
);

CREATE POLICY "Users can update metas in their empresas"
ON public.metas_financeiras FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'edit'::permission_type))
);

CREATE POLICY "Users can delete metas in their empresas"
ON public.metas_financeiras FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'delete'::permission_type))
);

-- =====================================================
-- 8. ANEXOS DE TRANSAÇÕES (comprovantes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transacao_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transacao_id uuid NOT NULL REFERENCES public.transacoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text,
  tipo text NOT NULL,
  tamanho integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transacao_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view anexos of their transacoes"
ON public.transacao_anexos FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.transacoes t 
    WHERE t.id = transacao_anexos.transacao_id 
    AND has_empresa_access(auth.uid(), t.empresa_id)
  )
);

CREATE POLICY "Users can insert anexos in their transacoes"
ON public.transacao_anexos FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.transacoes t 
    WHERE t.id = transacao_anexos.transacao_id 
    AND has_empresa_access(auth.uid(), t.empresa_id)
    AND has_permission(auth.uid(), t.empresa_id, 'financialace'::app_module, 'create'::permission_type)
  )
);

CREATE POLICY "Users can delete anexos of their transacoes"
ON public.transacao_anexos FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.transacoes t 
    WHERE t.id = transacao_anexos.transacao_id 
    AND has_empresa_access(auth.uid(), t.empresa_id)
    AND has_permission(auth.uid(), t.empresa_id, 'financialace'::app_module, 'delete'::permission_type)
  )
);

-- =====================================================
-- 9. IMPORTAÇÕES DE EXTRATO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.importacoes_extrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conta_bancaria_id uuid NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL CHECK (tipo_arquivo IN ('ofx', 'pdf', 'csv')),
  
  data_inicio date,
  data_fim date,
  total_transacoes integer DEFAULT 0,
  transacoes_importadas integer DEFAULT 0,
  transacoes_duplicadas integer DEFAULT 0,
  
  status text NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
  erro_mensagem text,
  
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.importacoes_extrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view importacoes of their empresas"
ON public.importacoes_extrato FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert importacoes in their empresas"
ON public.importacoes_extrato FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  (has_empresa_access(auth.uid(), empresa_id) AND 
   has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'create'::permission_type))
);

-- =====================================================
-- 10. TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_categorias_financeiras_updated_at
BEFORE UPDATE ON public.categorias_financeiras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_centros_custo_updated_at
BEFORE UPDATE ON public.centros_custo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transacoes_updated_at
BEFORE UPDATE ON public.transacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recorrencias_updated_at
BEFORE UPDATE ON public.recorrencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orcamentos_updated_at
BEFORE UPDATE ON public.orcamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_financeiras_updated_at
BEFORE UPDATE ON public.metas_financeiras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 11. BUCKET PARA COMPROVANTES
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-financeiros', 'comprovantes-financeiros', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Users can view comprovantes of their empresas"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'comprovantes-financeiros' AND
  (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.transacoes t
      WHERE has_empresa_access(auth.uid(), t.empresa_id)
      AND (storage.foldername(name))[1] = t.empresa_id::text
    )
  )
);

CREATE POLICY "Users can upload comprovantes to their empresas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes-financeiros' AND
  (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ue.empresa_id::text
    )
  )
);

CREATE POLICY "Users can delete comprovantes of their empresas"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comprovantes-financeiros' AND
  (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ue.empresa_id::text
    )
  )
);