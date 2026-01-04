
-- Corrigir search_path na função gerar_tarefas_empresa
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
