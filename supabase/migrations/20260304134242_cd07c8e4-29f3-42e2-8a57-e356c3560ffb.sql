
-- Tabela principal: registro de layouts de documentos
CREATE TABLE public.layout_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'xml', -- xml, txt_posicional, csv, pdf
  versao TEXT NOT NULL DEFAULT '1.0',
  descricao TEXT,
  namespace_pattern TEXT, -- regex para auto-detecção (ex: sped.fazenda.gov.br)
  root_element_pattern TEXT, -- regex para element raiz (ex: NFSe|nfeProc)
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de mapeamento campo a campo
CREATE TABLE public.layout_campos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES public.layout_documentos(id) ON DELETE CASCADE,
  grupo TEXT NOT NULL, -- prestador, tomador, servico, retencoes, totais, ide, emitente, destinatario
  campo_destino TEXT NOT NULL, -- nome padronizado: cnpj, razao_social, valor_ir, etc.
  tipo_dado TEXT NOT NULL DEFAULT 'texto', -- texto, moeda, data, numero, boolean
  caminhos_xpath TEXT[] NOT NULL, -- array de caminhos/tags para tentar em ordem de prioridade
  posicao_inicio INT, -- para TXT posicional
  posicao_fim INT, -- para TXT posicional
  transformacao TEXT, -- regex ou regra de transformação (ex: "split:T:0" para pegar antes do T em datas)
  valor_padrao TEXT, -- valor se não encontrar
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_layout_campos_layout_id ON public.layout_campos(layout_id);
CREATE INDEX idx_layout_documentos_tipo ON public.layout_documentos(tipo);
CREATE INDEX idx_layout_documentos_ativo ON public.layout_documentos(ativo);
CREATE UNIQUE INDEX idx_layout_campos_unique ON public.layout_campos(layout_id, grupo, campo_destino);

-- RLS
ALTER TABLE public.layout_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_campos ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura para todos autenticados, escrita para admins
CREATE POLICY "Authenticated users can read layouts"
  ON public.layout_documentos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage layouts"
  ON public.layout_documentos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can read layout fields"
  ON public.layout_campos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage layout fields"
  ON public.layout_campos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_layout_documentos_updated_at
  BEFORE UPDATE ON public.layout_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
