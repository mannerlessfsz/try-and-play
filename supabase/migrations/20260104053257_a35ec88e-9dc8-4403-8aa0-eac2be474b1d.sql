
-- Criar enum para regime tributário
CREATE TYPE public.regime_tributario AS ENUM (
  'nano_empreendedor',
  'mei',
  'simples_nacional',
  'lucro_presumido',
  'lucro_real'
);

-- Adicionar regime tributário na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN regime_tributario public.regime_tributario;

-- Criar tabela de tarefas modelo (templates)
CREATE TABLE public.tarefas_modelo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  departamento public.departamento_tipo NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'media',
  dia_vencimento INTEGER, -- dia do mês para vencimento (1-31)
  prazo_dias INTEGER, -- dias antes do vencimento para entrega
  requer_anexo BOOLEAN DEFAULT false,
  justificativa TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de relacionamento: quais regimes tributários usam cada tarefa modelo
CREATE TABLE public.tarefa_modelo_regimes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_modelo_id UUID NOT NULL REFERENCES public.tarefas_modelo(id) ON DELETE CASCADE,
  regime_tributario public.regime_tributario NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tarefa_modelo_id, regime_tributario)
);

-- Enable RLS
ALTER TABLE public.tarefas_modelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_modelo_regimes ENABLE ROW LEVEL SECURITY;

-- Policies para tarefas_modelo (admins e managers podem gerenciar)
CREATE POLICY "Usuários autenticados podem visualizar tarefas modelo" 
ON public.tarefas_modelo FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins podem gerenciar tarefas modelo" 
ON public.tarefas_modelo FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policies para tarefa_modelo_regimes
CREATE POLICY "Usuários autenticados podem visualizar regimes de tarefas" 
ON public.tarefa_modelo_regimes FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins podem gerenciar regimes de tarefas" 
ON public.tarefa_modelo_regimes FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger para updated_at em tarefas_modelo
CREATE TRIGGER update_tarefas_modelo_updated_at
BEFORE UPDATE ON public.tarefas_modelo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar tarefas de uma empresa baseado no regime tributário
CREATE OR REPLACE FUNCTION public.gerar_tarefas_empresa(p_empresa_id UUID, p_mes INTEGER, p_ano INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_regime public.regime_tributario;
  v_count INTEGER := 0;
  v_modelo RECORD;
  v_data_vencimento DATE;
  v_prazo_entrega DATE;
BEGIN
  -- Buscar regime da empresa
  SELECT regime_tributario INTO v_regime FROM public.empresas WHERE id = p_empresa_id;
  
  IF v_regime IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Para cada tarefa modelo do regime
  FOR v_modelo IN 
    SELECT tm.* 
    FROM public.tarefas_modelo tm
    INNER JOIN public.tarefa_modelo_regimes tmr ON tm.id = tmr.tarefa_modelo_id
    WHERE tmr.regime_tributario = v_regime AND tm.ativo = true
  LOOP
    -- Calcular data de vencimento
    IF v_modelo.dia_vencimento IS NOT NULL THEN
      v_data_vencimento := make_date(p_ano, p_mes, LEAST(v_modelo.dia_vencimento, 28));
    ELSE
      v_data_vencimento := (make_date(p_ano, p_mes, 1) + INTERVAL '1 month - 1 day')::DATE;
    END IF;
    
    -- Calcular prazo de entrega
    IF v_modelo.prazo_dias IS NOT NULL THEN
      v_prazo_entrega := v_data_vencimento - v_modelo.prazo_dias;
    ELSE
      v_prazo_entrega := v_data_vencimento;
    END IF;
    
    -- Verificar se já existe tarefa para esta empresa/modelo/mês/ano
    IF NOT EXISTS (
      SELECT 1 FROM public.tarefas 
      WHERE empresa_id = p_empresa_id 
        AND titulo = v_modelo.titulo
        AND EXTRACT(MONTH FROM data_vencimento) = p_mes
        AND EXTRACT(YEAR FROM data_vencimento) = p_ano
    ) THEN
      -- Inserir tarefa
      INSERT INTO public.tarefas (
        empresa_id, titulo, descricao, departamento, prioridade,
        data_vencimento, prazo_entrega, requer_anexo, justificativa, status
      ) VALUES (
        p_empresa_id, v_modelo.titulo, v_modelo.descricao, v_modelo.departamento,
        v_modelo.prioridade, v_data_vencimento, v_prazo_entrega, 
        v_modelo.requer_anexo, v_modelo.justificativa, 'pendente'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
