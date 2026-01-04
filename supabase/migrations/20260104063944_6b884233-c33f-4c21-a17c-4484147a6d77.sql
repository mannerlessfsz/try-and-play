-- Função melhorada que gera tarefas com competência correta (mês anterior)
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
  v_competencia_mes INTEGER;
  v_competencia_ano INTEGER;
BEGIN
  -- Buscar regime da empresa
  SELECT regime_tributario INTO v_regime FROM public.empresas WHERE id = p_empresa_id;
  
  IF v_regime IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Competência é sempre do mês anterior
  IF p_mes = 1 THEN
    v_competencia_mes := 12;
    v_competencia_ano := p_ano - 1;
  ELSE
    v_competencia_mes := p_mes - 1;
    v_competencia_ano := p_ano;
  END IF;
  
  -- Para cada tarefa modelo do regime
  FOR v_modelo IN 
    SELECT tm.* 
    FROM public.tarefas_modelo tm
    INNER JOIN public.tarefa_modelo_regimes tmr ON tm.id = tmr.tarefa_modelo_id
    WHERE tmr.regime_tributario = v_regime AND tm.ativo = true
  LOOP
    -- Verificar se deve gerar baseado na periodicidade (considerando competência)
    v_deve_gerar := FALSE;
    
    CASE v_modelo.periodicidade
      WHEN 'mensal' THEN
        v_deve_gerar := TRUE;
      WHEN 'trimestral' THEN
        -- Competência trimestral: 3, 6, 9, 12
        v_deve_gerar := v_competencia_mes IN (3, 6, 9, 12);
      WHEN 'semestral' THEN
        -- Competência semestral: 6, 12
        v_deve_gerar := v_competencia_mes IN (6, 12);
      WHEN 'anual' THEN
        -- Competência anual: dezembro
        v_deve_gerar := v_competencia_mes = 12;
      ELSE
        v_deve_gerar := TRUE;
    END CASE;
    
    IF NOT v_deve_gerar THEN
      CONTINUE;
    END IF;
    
    -- Calcular data de vencimento (no mês atual, pois é quando a obrigação vence)
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
    
    -- Verificar se já existe tarefa para esta empresa/modelo/competência
    IF NOT EXISTS (
      SELECT 1 FROM public.tarefas 
      WHERE empresa_id = p_empresa_id 
        AND titulo = v_modelo.titulo
        AND EXTRACT(MONTH FROM data_vencimento) = p_mes
        AND EXTRACT(YEAR FROM data_vencimento) = p_ano
    ) THEN
      -- Inserir tarefa com referência à competência na descrição
      INSERT INTO public.tarefas (
        empresa_id, titulo, descricao, departamento, prioridade,
        data_vencimento, prazo_entrega, requer_anexo, justificativa, status
      ) VALUES (
        p_empresa_id, 
        v_modelo.titulo, 
        COALESCE(v_modelo.descricao, '') || ' (Competência: ' || 
          LPAD(v_competencia_mes::text, 2, '0') || '/' || v_competencia_ano || ')',
        v_modelo.departamento,
        v_modelo.prioridade, 
        v_data_vencimento, 
        v_prazo_entrega, 
        v_modelo.requer_anexo, 
        v_modelo.justificativa, 
        'pendente'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$function$;

-- Função para sincronizar tarefas quando um modelo é alterado
CREATE OR REPLACE FUNCTION public.sync_tarefas_on_modelo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa RECORD;
  v_mes INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_ano INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Se o modelo foi ativado ou criado, gerar tarefas para empresas com regime compatível
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.ativo = true AND (OLD.ativo = false OR OLD.ativo IS NULL)) THEN
    FOR v_empresa IN 
      SELECT DISTINCT e.id 
      FROM public.empresas e
      INNER JOIN public.tarefa_modelo_regimes tmr ON tmr.regime_tributario = e.regime_tributario
      WHERE tmr.tarefa_modelo_id = NEW.id
        AND e.regime_tributario IS NOT NULL
    LOOP
      PERFORM public.gerar_tarefas_empresa(v_empresa.id, v_mes, v_ano);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Função para sincronizar tarefas quando um regime é adicionado a um modelo
CREATE OR REPLACE FUNCTION public.sync_tarefas_on_regime_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa RECORD;
  v_mes INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_ano INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_modelo_ativo BOOLEAN;
BEGIN
  -- Verificar se o modelo está ativo
  SELECT ativo INTO v_modelo_ativo FROM public.tarefas_modelo WHERE id = NEW.tarefa_modelo_id;
  
  IF v_modelo_ativo = true THEN
    -- Gerar tarefas para todas as empresas com este regime
    FOR v_empresa IN 
      SELECT id FROM public.empresas 
      WHERE regime_tributario = NEW.regime_tributario
    LOOP
      PERFORM public.gerar_tarefas_empresa(v_empresa.id, v_mes, v_ano);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Função para sincronizar tarefas quando o regime da empresa muda
CREATE OR REPLACE FUNCTION public.sync_tarefas_on_empresa_regime_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mes INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_ano INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Se o regime mudou e o novo regime não é null, gerar tarefas
  IF NEW.regime_tributario IS NOT NULL AND 
     (OLD.regime_tributario IS NULL OR NEW.regime_tributario != OLD.regime_tributario) THEN
    PERFORM public.gerar_tarefas_empresa(NEW.id, v_mes, v_ano);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar triggers
DROP TRIGGER IF EXISTS trigger_sync_tarefas_modelo ON public.tarefas_modelo;
CREATE TRIGGER trigger_sync_tarefas_modelo
  AFTER INSERT OR UPDATE ON public.tarefas_modelo
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tarefas_on_modelo_change();

DROP TRIGGER IF EXISTS trigger_sync_tarefas_regime_link ON public.tarefa_modelo_regimes;
CREATE TRIGGER trigger_sync_tarefas_regime_link
  AFTER INSERT ON public.tarefa_modelo_regimes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tarefas_on_regime_link();

DROP TRIGGER IF EXISTS trigger_sync_tarefas_empresa_regime ON public.empresas;
CREATE TRIGGER trigger_sync_tarefas_empresa_regime
  AFTER UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tarefas_on_empresa_regime_change();