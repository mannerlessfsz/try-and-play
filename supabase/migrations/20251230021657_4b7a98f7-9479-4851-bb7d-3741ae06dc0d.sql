-- Tabela de orçamentos para empresas de serviço
CREATE TABLE public.orcamentos_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  numero INTEGER,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_orcamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado', 'convertido')),
  subtotal NUMERIC(15,2) DEFAULT 0,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  condicao_pagamento TEXT,
  observacoes TEXT,
  observacoes_internas TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens do orçamento (serviços)
CREATE TABLE public.orcamento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos_servico(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(15,3) NOT NULL DEFAULT 1,
  unidade TEXT DEFAULT 'UN',
  valor_unitario NUMERIC(15,2) NOT NULL,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sequence para número do orçamento por empresa
CREATE OR REPLACE FUNCTION public.gerar_numero_orcamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
    FROM public.orcamentos_servico
    WHERE empresa_id = NEW.empresa_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_gerar_numero_orcamento
  BEFORE INSERT ON public.orcamentos_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_numero_orcamento();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_orcamentos_servico_updated_at
  BEFORE UPDATE ON public.orcamentos_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para orcamentos_servico
ALTER TABLE public.orcamentos_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon orcamentos_servico"
  ON public.orcamentos_servico
  FOR SELECT
  TO anon
  USING (false);

CREATE POLICY "Users can view orcamentos of their empresas"
  ON public.orcamentos_servico
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can insert orcamentos in their empresas"
  ON public.orcamentos_servico
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can update orcamentos in their empresas"
  ON public.orcamentos_servico
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Users can delete orcamentos in their empresas"
  ON public.orcamentos_servico
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

-- RLS para orcamento_itens
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon orcamento_itens"
  ON public.orcamento_itens
  FOR SELECT
  TO anon
  USING (false);

CREATE POLICY "Users can view orcamento_itens through orcamentos"
  ON public.orcamento_itens
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orcamentos_servico o
    WHERE o.id = orcamento_itens.orcamento_id
    AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), o.empresa_id))
  ));

CREATE POLICY "Users can insert orcamento_itens"
  ON public.orcamento_itens
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orcamentos_servico o
    WHERE o.id = orcamento_itens.orcamento_id
    AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), o.empresa_id))
  ));

CREATE POLICY "Users can update orcamento_itens"
  ON public.orcamento_itens
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orcamentos_servico o
    WHERE o.id = orcamento_itens.orcamento_id
    AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), o.empresa_id))
  ));

CREATE POLICY "Users can delete orcamento_itens"
  ON public.orcamento_itens
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orcamentos_servico o
    WHERE o.id = orcamento_itens.orcamento_id
    AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), o.empresa_id))
  ));

-- Trigger: Orçamento aprovado gera receita pendente
CREATE OR REPLACE FUNCTION public.gerar_receita_orcamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate when status changes to 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
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
      'Orçamento #' || COALESCE(NEW.numero::text, NEW.id::text) || ' - ' || NEW.titulo,
      COALESCE(NEW.total, 0),
      CURRENT_DATE,
      COALESCE(NEW.data_validade, CURRENT_DATE + INTERVAL '30 days'),
      'pendente',
      'ORC-' || NEW.id::text,
      'Gerado automaticamente do orçamento aprovado'
    );
    
    -- Update status to converted
    NEW.status := 'convertido';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_gerar_receita_orcamento
  BEFORE UPDATE OF status ON public.orcamentos_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_receita_orcamento();
