-- Trigger para baixar estoque automaticamente quando venda for concluída
CREATE OR REPLACE FUNCTION public.baixar_estoque_venda()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  produto RECORD;
BEGIN
  -- Só executa quando status muda para 'concluido'
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status <> 'concluido') THEN
    -- Para cada item da venda
    FOR item IN 
      SELECT vi.produto_id, vi.quantidade, p.estoque_atual, p.nome
      FROM venda_itens vi
      JOIN produtos p ON p.id = vi.produto_id
      WHERE vi.venda_id = NEW.id
    LOOP
      -- Atualiza estoque do produto
      UPDATE produtos 
      SET estoque_atual = COALESCE(estoque_atual, 0) - item.quantidade,
          updated_at = now()
      WHERE id = item.produto_id;
      
      -- Registra movimento de estoque
      INSERT INTO estoque_movimentos (
        empresa_id,
        produto_id,
        tipo,
        quantidade,
        saldo_anterior,
        saldo_posterior,
        documento_tipo,
        documento_id,
        observacao
      ) VALUES (
        NEW.empresa_id,
        item.produto_id,
        'saida',
        item.quantidade,
        COALESCE(item.estoque_atual, 0),
        COALESCE(item.estoque_atual, 0) - item.quantidade,
        'venda',
        NEW.id,
        'Baixa automática - Venda #' || COALESCE(NEW.numero::text, NEW.id::text)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger se existir e cria novamente
DROP TRIGGER IF EXISTS trigger_baixar_estoque_venda ON public.vendas;
CREATE TRIGGER trigger_baixar_estoque_venda
  AFTER UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.baixar_estoque_venda();