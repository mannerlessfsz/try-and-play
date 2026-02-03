-- Tabela de empresas externas para conversores
CREATE TABLE public.empresas_externas_conversores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  codigo_empresa TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(codigo_empresa)
);

-- Tabela para referenciar os planos de contas
CREATE TABLE public.planos_contas_externos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_externa_id UUID NOT NULL REFERENCES empresas_externas_conversores(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT,
  storage_path TEXT,
  metadados JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_empresas_externas_codigo ON empresas_externas_conversores(codigo_empresa);
CREATE INDEX idx_empresas_externas_cnpj ON empresas_externas_conversores(cnpj);
CREATE INDEX idx_planos_contas_empresa ON planos_contas_externos(empresa_externa_id);

-- Trigger para updated_at
CREATE TRIGGER update_empresas_externas_updated_at
  BEFORE UPDATE ON empresas_externas_conversores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planos_contas_updated_at
  BEFORE UPDATE ON planos_contas_externos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para empresas_externas_conversores
ALTER TABLE empresas_externas_conversores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view empresas externas"
  ON empresas_externas_conversores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users with conversores access can create empresas externas"
  ON empresas_externas_conversores FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users with conversores access can update empresas externas"
  ON empresas_externas_conversores FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete empresas externas"
  ON empresas_externas_conversores FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS para planos_contas_externos
ALTER TABLE planos_contas_externos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view planos contas"
  ON planos_contas_externos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create planos contas"
  ON planos_contas_externos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update planos contas"
  ON planos_contas_externos FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete planos contas"
  ON planos_contas_externos FOR DELETE
  USING (is_admin(auth.uid()));

-- Bucket para armazenar arquivos de plano de contas
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('planos-contas', 'planos-contas', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Authenticated users can upload planos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'planos-contas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view planos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'planos-contas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their planos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'planos-contas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete planos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'planos-contas' AND is_admin(auth.uid()));