-- Adicionar tabela para permissões granulares por recurso dentro de cada módulo
CREATE TABLE IF NOT EXISTS public.user_resource_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  module TEXT NOT NULL, -- 'financialace', 'erp', 'taskvault', etc.
  resource TEXT NOT NULL, -- 'transacoes', 'categorias', 'contas_bancarias', 'clientes', 'produtos', etc.
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id, module, resource)
);

-- Enable RLS
ALTER TABLE public.user_resource_permissions ENABLE ROW LEVEL SECURITY;

-- Policy para admins gerenciarem e usuários verem suas próprias permissões
CREATE POLICY "Admins can manage resource permissions" 
ON public.user_resource_permissions 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own resource permissions" 
ON public.user_resource_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_user_resource_permissions_updated_at
BEFORE UPDATE ON public.user_resource_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campo de competência nas transações para controle
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS competencia_ano INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
ADD COLUMN IF NOT EXISTS competencia_mes INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE);

-- Função para validar data de transação dentro da competência e não no passado
CREATE OR REPLACE FUNCTION public.validate_transacao_data()
RETURNS TRIGGER AS $$
DECLARE
  v_competencia_inicio DATE;
  v_competencia_fim DATE;
  v_hoje DATE;
BEGIN
  v_hoje := CURRENT_DATE;
  
  -- Define período da competência
  v_competencia_inicio := make_date(NEW.competencia_ano, NEW.competencia_mes, 1);
  v_competencia_fim := (v_competencia_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Verifica se a data está dentro da competência
  IF NEW.data_transacao < v_competencia_inicio OR NEW.data_transacao > v_competencia_fim THEN
    RAISE EXCEPTION 'A data da transação deve estar dentro da competência selecionada (% a %)', 
      v_competencia_inicio, v_competencia_fim;
  END IF;
  
  -- Verifica se a data não é no passado (antes de hoje)
  IF NEW.data_transacao < v_hoje THEN
    RAISE EXCEPTION 'Não é permitido cadastrar transações com datas passadas. A data deve ser a partir de hoje (%).', v_hoje;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para validar data na inserção
CREATE TRIGGER validate_transacao_data_trigger
BEFORE INSERT ON public.transacoes
FOR EACH ROW
EXECUTE FUNCTION public.validate_transacao_data();