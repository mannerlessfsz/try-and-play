
-- Tabela de regras de retenção por código de serviço (LC 116)
CREATE TABLE public.regras_retencao_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_servico TEXT NOT NULL,
  descricao_servico TEXT NOT NULL,
  aliquota_ir NUMERIC(6,4) NOT NULL DEFAULT 0,
  aliquota_pis NUMERIC(6,4) NOT NULL DEFAULT 0,
  aliquota_cofins NUMERIC(6,4) NOT NULL DEFAULT 0,
  aliquota_csll NUMERIC(6,4) NOT NULL DEFAULT 0,
  aliquota_inss NUMERIC(6,4) NOT NULL DEFAULT 0,
  aliquota_iss NUMERIC(6,4) NOT NULL DEFAULT 0,
  reter_ir BOOLEAN NOT NULL DEFAULT false,
  reter_pis BOOLEAN NOT NULL DEFAULT false,
  reter_cofins BOOLEAN NOT NULL DEFAULT false,
  reter_csll BOOLEAN NOT NULL DEFAULT false,
  reter_inss BOOLEAN NOT NULL DEFAULT false,
  reter_iss BOOLEAN NOT NULL DEFAULT false,
  valor_minimo_retencao NUMERIC(12,2) DEFAULT 0,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(codigo_servico)
);

-- RLS
ALTER TABLE public.regras_retencao_servico ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler
CREATE POLICY "Authenticated users can read regras_retencao"
  ON public.regras_retencao_servico FOR SELECT TO authenticated
  USING (true);

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage regras_retencao"
  ON public.regras_retencao_servico FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_regras_retencao_updated_at
  BEFORE UPDATE ON public.regras_retencao_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir regras padrão comuns da LC 116
INSERT INTO public.regras_retencao_servico (codigo_servico, descricao_servico, aliquota_ir, aliquota_pis, aliquota_cofins, aliquota_csll, aliquota_inss, aliquota_iss, reter_ir, reter_pis, reter_cofins, reter_csll, reter_inss, reter_iss) VALUES
('1.01', 'Análise e desenvolvimento de sistemas', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.05, true, true, true, true, false, false),
('1.02', 'Programação', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.05, true, true, true, true, false, false),
('1.03', 'Processamento de dados', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('1.04', 'Elaboração de programas de computadores', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('1.05', 'Licenciamento ou cessão de uso de programas', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('7.02', 'Execução de obras - construção civil', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.03, true, true, true, true, true, true),
('7.05', 'Reparação e conservação de edifícios', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.05, true, true, true, true, true, false),
('11.01', 'Guarda e estacionamento de veículos', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('11.02', 'Vigilância, segurança ou monitoramento', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.05, true, true, true, true, true, false),
('17.01', 'Assessoria ou consultoria', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('17.02', 'Datilografia e estenografia', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('17.05', 'Contabilidade', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('17.06', 'Consultoria e assessoria econômica ou financeira', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('17.09', 'Perícias, laudos, exames técnicos', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('17.12', 'Administração de fundos, consórcios', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('17.19', 'Advocacia', 0.015, 0.0065, 0.03, 0.01, 0, 0.05, true, true, true, true, false, false),
('4.01', 'Medicina e biomedicina', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.03, true, true, true, true, true, false),
('4.02', 'Análises clínicas e patologia', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.03, true, true, true, true, true, false),
('14.01', 'Lubrificação, limpeza, manutenção', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.05, true, true, true, true, true, false),
('14.06', 'Instalação e montagem de aparelhos', 0.015, 0.0065, 0.03, 0.01, 0.11, 0.05, true, true, true, true, true, false);
