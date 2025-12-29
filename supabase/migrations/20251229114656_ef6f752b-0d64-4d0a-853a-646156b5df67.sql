-- =============================================
-- ERP DATABASE STRUCTURE
-- =============================================

-- 1. ENUM para tipos de empresa
DO $$ BEGIN
  CREATE TYPE public.tipo_empresa AS ENUM ('comercio', 'servicos', 'industria', 'misto');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. ENUM para status de pedidos
DO $$ BEGIN
  CREATE TYPE public.status_pedido AS ENUM ('rascunho', 'pendente', 'aprovado', 'em_andamento', 'concluido', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. ENUM para tipo de movimentação de estoque
DO $$ BEGIN
  CREATE TYPE public.tipo_movimento_estoque AS ENUM ('entrada', 'saida', 'ajuste', 'transferencia');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- CONFIGURAÇÃO DE EMPRESA (TEMPLATE)
-- =============================================
CREATE TABLE IF NOT EXISTS public.empresa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_empresa tipo_empresa NOT NULL DEFAULT 'misto',
  modulos_habilitados JSONB DEFAULT '["financeiro", "estoque", "vendas", "compras", "crm"]'::jsonb,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  campos_customizados JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon empresa_config" ON public.empresa_config FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view empresa_config of their empresas" ON public.empresa_config FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Admins can manage empresa_config" ON public.empresa_config FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- =============================================
-- UNIDADES DE MEDIDA
-- =============================================
CREATE TABLE IF NOT EXISTS public.unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, codigo)
);

ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon unidades" ON public.unidades_medida FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view unidades of their empresas" ON public.unidades_medida FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can manage unidades with permission" ON public.unidades_medida FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR (public.has_empresa_access(auth.uid(), empresa_id)));

-- =============================================
-- CATEGORIAS DE PRODUTOS
-- =============================================
CREATE TABLE IF NOT EXISTS public.categorias_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria_pai_id UUID REFERENCES public.categorias_produtos(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon categorias_produtos" ON public.categorias_produtos FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view categorias_produtos of their empresas" ON public.categorias_produtos FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can manage categorias_produtos" ON public.categorias_produtos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));

-- =============================================
-- PRODUTOS
-- =============================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.categorias_produtos(id),
  unidade_id UUID REFERENCES public.unidades_medida(id),
  codigo TEXT,
  sku TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'produto' CHECK (tipo IN ('produto', 'servico', 'materia_prima', 'insumo')),
  preco_custo NUMERIC(15,2) DEFAULT 0,
  preco_venda NUMERIC(15,2) DEFAULT 0,
  margem_lucro NUMERIC(5,2),
  estoque_minimo NUMERIC(15,3) DEFAULT 0,
  estoque_maximo NUMERIC(15,3),
  estoque_atual NUMERIC(15,3) DEFAULT 0,
  controla_estoque BOOLEAN DEFAULT true,
  peso NUMERIC(10,3),
  ncm TEXT,
  codigo_barras TEXT,
  imagem_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_produtos_empresa ON public.produtos(empresa_id);
CREATE INDEX idx_produtos_sku ON public.produtos(empresa_id, sku);
CREATE INDEX idx_produtos_nome ON public.produtos(empresa_id, nome);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon produtos" ON public.produtos FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view produtos of their empresas" ON public.produtos FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can insert produtos" ON public.produtos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can update produtos" ON public.produtos FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can delete produtos" ON public.produtos FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));

-- =============================================
-- CLIENTES
-- =============================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_pessoa TEXT DEFAULT 'fisica' CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  nome TEXT NOT NULL,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  rg_ie TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  pais TEXT DEFAULT 'Brasil',
  data_nascimento DATE,
  limite_credito NUMERIC(15,2) DEFAULT 0,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX idx_clientes_cpf_cnpj ON public.clientes(empresa_id, cpf_cnpj);
CREATE INDEX idx_clientes_nome ON public.clientes(empresa_id, nome);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon clientes" ON public.clientes FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view clientes of their empresas" ON public.clientes FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can insert clientes" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can update clientes" ON public.clientes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can delete clientes" ON public.clientes FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));

-- =============================================
-- FORNECEDORES
-- =============================================
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_pessoa TEXT DEFAULT 'juridica' CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  nome TEXT NOT NULL,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  rg_ie TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  pais TEXT DEFAULT 'Brasil',
  contato_nome TEXT,
  contato_telefone TEXT,
  contato_email TEXT,
  prazo_entrega_dias INTEGER,
  condicao_pagamento TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fornecedores_empresa ON public.fornecedores(empresa_id);
CREATE INDEX idx_fornecedores_cpf_cnpj ON public.fornecedores(empresa_id, cpf_cnpj);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon fornecedores" ON public.fornecedores FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view fornecedores of their empresas" ON public.fornecedores FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can insert fornecedores" ON public.fornecedores FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can update fornecedores" ON public.fornecedores FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can delete fornecedores" ON public.fornecedores FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));

-- =============================================
-- MOVIMENTAÇÕES DE ESTOQUE
-- =============================================
CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo tipo_movimento_estoque NOT NULL,
  quantidade NUMERIC(15,3) NOT NULL,
  custo_unitario NUMERIC(15,2),
  custo_total NUMERIC(15,2),
  saldo_anterior NUMERIC(15,3),
  saldo_posterior NUMERIC(15,3),
  documento_tipo TEXT,
  documento_id UUID,
  lote TEXT,
  validade DATE,
  observacao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estoque_movimentos_produto ON public.estoque_movimentos(produto_id);
CREATE INDEX idx_estoque_movimentos_empresa ON public.estoque_movimentos(empresa_id);

ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon estoque_movimentos" ON public.estoque_movimentos FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view estoque_movimentos of their empresas" ON public.estoque_movimentos FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can insert estoque_movimentos" ON public.estoque_movimentos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));

-- =============================================
-- VENDAS (PEDIDOS DE VENDA)
-- =============================================
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id),
  numero INTEGER,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega DATE,
  status status_pedido DEFAULT 'rascunho',
  subtotal NUMERIC(15,2) DEFAULT 0,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  acrescimo NUMERIC(15,2) DEFAULT 0,
  frete NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  condicao_pagamento TEXT,
  forma_pagamento TEXT,
  vendedor_id UUID REFERENCES auth.users(id),
  comissao_percentual NUMERIC(5,2),
  comissao_valor NUMERIC(15,2),
  observacoes TEXT,
  observacoes_internas TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendas_empresa ON public.vendas(empresa_id);
CREATE INDEX idx_vendas_cliente ON public.vendas(cliente_id);
CREATE INDEX idx_vendas_data ON public.vendas(empresa_id, data_venda);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon vendas" ON public.vendas FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view vendas of their empresas" ON public.vendas FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can insert vendas" ON public.vendas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can update vendas" ON public.vendas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can delete vendas" ON public.vendas FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));

-- =============================================
-- ITENS DE VENDA
-- =============================================
CREATE TABLE IF NOT EXISTS public.venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC(15,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(15,2) NOT NULL,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venda_itens_venda ON public.venda_itens(venda_id);

ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon venda_itens" ON public.venda_itens FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view venda_itens through vendas" ON public.venda_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_itens.venda_id AND (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), v.empresa_id))));
CREATE POLICY "Users can insert venda_itens" ON public.venda_itens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_itens.venda_id AND (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), v.empresa_id))));
CREATE POLICY "Users can update venda_itens" ON public.venda_itens FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_itens.venda_id AND (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), v.empresa_id))));
CREATE POLICY "Users can delete venda_itens" ON public.venda_itens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_itens.venda_id AND (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), v.empresa_id))));

-- =============================================
-- COMPRAS (PEDIDOS DE COMPRA)
-- =============================================
CREATE TABLE IF NOT EXISTS public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  numero INTEGER,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  status status_pedido DEFAULT 'rascunho',
  subtotal NUMERIC(15,2) DEFAULT 0,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  frete NUMERIC(15,2) DEFAULT 0,
  outras_despesas NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  condicao_pagamento TEXT,
  forma_pagamento TEXT,
  observacoes TEXT,
  observacoes_internas TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compras_empresa ON public.compras(empresa_id);
CREATE INDEX idx_compras_fornecedor ON public.compras(fornecedor_id);
CREATE INDEX idx_compras_data ON public.compras(empresa_id, data_compra);

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon compras" ON public.compras FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view compras of their empresas" ON public.compras FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can insert compras" ON public.compras FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can update compras" ON public.compras FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Users can delete compras" ON public.compras FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), empresa_id));

-- =============================================
-- ITENS DE COMPRA
-- =============================================
CREATE TABLE IF NOT EXISTS public.compra_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC(15,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(15,2) NOT NULL,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  quantidade_recebida NUMERIC(15,3) DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compra_itens_compra ON public.compra_itens(compra_id);

ALTER TABLE public.compra_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon compra_itens" ON public.compra_itens FOR SELECT TO anon USING (false);
CREATE POLICY "Users can view compra_itens through compras" ON public.compra_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compra_itens.compra_id AND (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), c.empresa_id))));
CREATE POLICY "Users can insert compra_itens" ON public.compra_itens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compra_itens.compra_id AND (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), c.empresa_id))));
CREATE POLICY "Users can update compra_itens" ON public.compra_itens FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compra_itens.compra_id AND (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), c.empresa_id))));
CREATE POLICY "Users can delete compra_itens" ON public.compra_itens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compra_itens.compra_id AND (public.is_admin(auth.uid()) OR public.has_empresa_access(auth.uid(), c.empresa_id))));

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================
CREATE TRIGGER update_empresa_config_updated_at BEFORE UPDATE ON public.empresa_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categorias_produtos_updated_at BEFORE UPDATE ON public.categorias_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: ATUALIZAR ESTOQUE DO PRODUTO
-- =============================================
CREATE OR REPLACE FUNCTION public.atualizar_estoque_produto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_atual NUMERIC(15,3);
  v_novo_saldo NUMERIC(15,3);
BEGIN
  -- Busca saldo atual
  SELECT estoque_atual INTO v_saldo_atual FROM public.produtos WHERE id = NEW.produto_id;
  v_saldo_atual := COALESCE(v_saldo_atual, 0);
  
  -- Calcula novo saldo
  IF NEW.tipo = 'entrada' THEN
    v_novo_saldo := v_saldo_atual + NEW.quantidade;
  ELSIF NEW.tipo = 'saida' THEN
    v_novo_saldo := v_saldo_atual - NEW.quantidade;
  ELSIF NEW.tipo = 'ajuste' THEN
    v_novo_saldo := NEW.quantidade; -- Ajuste define valor absoluto
  ELSE
    v_novo_saldo := v_saldo_atual;
  END IF;
  
  -- Atualiza saldos no registro
  NEW.saldo_anterior := v_saldo_atual;
  NEW.saldo_posterior := v_novo_saldo;
  
  -- Atualiza estoque do produto
  UPDATE public.produtos SET estoque_atual = v_novo_saldo WHERE id = NEW.produto_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_estoque
  BEFORE INSERT ON public.estoque_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_estoque_produto();

-- =============================================
-- ADICIONAR MÓDULO ERP NO ENUM
-- =============================================
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'erp';

-- =============================================
-- GRANTS
-- =============================================
REVOKE ALL ON TABLE public.empresa_config FROM anon;
REVOKE ALL ON TABLE public.unidades_medida FROM anon;
REVOKE ALL ON TABLE public.categorias_produtos FROM anon;
REVOKE ALL ON TABLE public.produtos FROM anon;
REVOKE ALL ON TABLE public.clientes FROM anon;
REVOKE ALL ON TABLE public.fornecedores FROM anon;
REVOKE ALL ON TABLE public.estoque_movimentos FROM anon;
REVOKE ALL ON TABLE public.vendas FROM anon;
REVOKE ALL ON TABLE public.venda_itens FROM anon;
REVOKE ALL ON TABLE public.compras FROM anon;
REVOKE ALL ON TABLE public.compra_itens FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.empresa_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.unidades_medida TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categorias_produtos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.produtos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fornecedores TO authenticated;
GRANT SELECT, INSERT ON TABLE public.estoque_movimentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vendas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.venda_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.compras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.compra_itens TO authenticated;