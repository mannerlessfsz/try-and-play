-- Drop existing trigger and function
DROP TRIGGER IF EXISTS validate_transacao_data_trigger ON public.transacoes;
DROP FUNCTION IF EXISTS public.validate_transacao_data();

-- Create updated validation function that allows transactions up to 1 month before current date
CREATE OR REPLACE FUNCTION public.validate_transacao_data()
RETURNS TRIGGER AS $$
DECLARE
  primeiro_dia_mes_anterior DATE;
BEGIN
  -- Calculate the first day of the previous month
  primeiro_dia_mes_anterior := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month';
  
  -- Validate that transaction date is not before the first day of previous month
  IF NEW.data_transacao < primeiro_dia_mes_anterior THEN
    RAISE EXCEPTION 'A data da transação não pode ser anterior ao mês anterior (%).',
      TO_CHAR(primeiro_dia_mes_anterior, 'MM/YYYY');
  END IF;
  
  -- Validate competency fields if provided
  IF NEW.competencia_mes IS NOT NULL AND NEW.competencia_ano IS NOT NULL THEN
    -- Check if the competency is not before the previous month
    IF (NEW.competencia_ano * 12 + NEW.competencia_mes) < 
       (EXTRACT(YEAR FROM primeiro_dia_mes_anterior) * 12 + EXTRACT(MONTH FROM primeiro_dia_mes_anterior)) THEN
      RAISE EXCEPTION 'A competência não pode ser anterior ao mês anterior (%).',
        TO_CHAR(primeiro_dia_mes_anterior, 'MM/YYYY');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER validate_transacao_data_trigger
  BEFORE INSERT OR UPDATE ON public.transacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transacao_data();