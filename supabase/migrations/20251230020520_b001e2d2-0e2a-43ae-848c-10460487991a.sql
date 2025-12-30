
-- Trigger function: Vendas concluídas geram contas a receber
CREATE OR REPLACE FUNCTION public.gerar_receita_venda()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate when status changes to 'concluido'
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
    INSERT INTO public.transacoes (
      empresa_id,
      tipo,
      descricao,
      valor,
      data_transacao,
      data_vencimento,
      status,
      numero_documento,
      observacoes
    ) VALUES (
      NEW.empresa_id,
      'receita',
      'Venda #' || COALESCE(NEW.numero::text, NEW.id::text),
      COALESCE(NEW.total, 0),
      COALESCE(NEW.data_venda, CURRENT_DATE),
      COALESCE(NEW.data_venda, CURRENT_DATE),
      'pendente',
      'VENDA-' || NEW.id::text,
      'Gerado automaticamente da venda'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for vendas
DROP TRIGGER IF EXISTS trigger_gerar_receita_venda ON public.vendas;
CREATE TRIGGER trigger_gerar_receita_venda
  AFTER INSERT OR UPDATE OF status ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_receita_venda();

-- Trigger function: Compras geram contas a pagar
CREATE OR REPLACE FUNCTION public.gerar_despesa_compra()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate when status changes to 'confirmado' or 'concluido'
  IF NEW.status IN ('confirmado', 'concluido') AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmado', 'concluido')) THEN
    INSERT INTO public.transacoes (
      empresa_id,
      tipo,
      descricao,
      valor,
      data_transacao,
      data_vencimento,
      status,
      numero_documento,
      observacoes
    ) VALUES (
      NEW.empresa_id,
      'despesa',
      'Compra #' || COALESCE(NEW.numero::text, NEW.id::text),
      COALESCE(NEW.total, 0),
      COALESCE(NEW.data_compra, CURRENT_DATE),
      COALESCE(NEW.data_entrega_prevista, NEW.data_compra, CURRENT_DATE),
      'pendente',
      'COMPRA-' || NEW.id::text,
      'Gerado automaticamente da compra'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for compras
DROP TRIGGER IF EXISTS trigger_gerar_despesa_compra ON public.compras;
CREATE TRIGGER trigger_gerar_despesa_compra
  AFTER INSERT OR UPDATE OF status ON public.compras
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_despesa_compra();
