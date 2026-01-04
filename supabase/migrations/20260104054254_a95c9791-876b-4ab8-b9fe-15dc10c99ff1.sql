-- Add periodicidade field to tarefas_modelo
ALTER TABLE public.tarefas_modelo 
ADD COLUMN periodicidade TEXT NOT NULL DEFAULT 'mensal';

-- Add comment for documentation
COMMENT ON COLUMN public.tarefas_modelo.periodicidade IS 'Periodicidade da tarefa: mensal, trimestral, semestral, anual';

-- Update the gerar_tarefas_empresa function to consider periodicidade
CREATE OR REPLACE FUNCTION public.gerar_tarefas_empresa(p_empresa_id uuid, p_mes integer, p_ano integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_regime public.regime_tributario;
  v_count INTEGER := 0;
  v_modelo RECORD;
  v_data_vencimento DATE;
  v_prazo_entrega DATE;
  v_deve_gerar BOOLEAN;
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
    -- Verificar se deve gerar baseado na periodicidade
    v_deve_gerar := FALSE;
    
    CASE v_modelo.periodicidade
      WHEN 'mensal' THEN
        v_deve_gerar := TRUE;
      WHEN 'trimestral' THEN
        -- Gerar nos meses 1, 4, 7, 10 (ou próximo mês após trimestre)
        v_deve_gerar := p_mes IN (1, 4, 7, 10);
      WHEN 'semestral' THEN
        -- Gerar nos meses 1 e 7
        v_deve_gerar := p_mes IN (1, 7);
      WHEN 'anual' THEN
        -- Gerar apenas em janeiro
        v_deve_gerar := p_mes = 1;
      ELSE
        v_deve_gerar := TRUE;
    END CASE;
    
    IF NOT v_deve_gerar THEN
      CONTINUE;
    END IF;
    
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
$function$;