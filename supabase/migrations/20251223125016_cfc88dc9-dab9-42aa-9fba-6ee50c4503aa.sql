-- Create table for company module access
CREATE TABLE public.empresa_modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo public.app_module NOT NULL,
  modo TEXT NOT NULL DEFAULT 'basico' CHECK (modo IN ('basico', 'pro')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, modulo)
);

-- Create table for bank accounts
CREATE TABLE public.contas_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT,
  tipo TEXT NOT NULL DEFAULT 'corrente' CHECK (tipo IN ('corrente', 'poupanca', 'investimento')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.empresa_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

-- RLS Policies for empresa_modulos
CREATE POLICY "Users can view empresa_modulos of their empresas"
ON public.empresa_modulos
FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Only admins can manage empresa_modulos"
ON public.empresa_modulos
FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for contas_bancarias
CREATE POLICY "Users can view contas_bancarias of their empresas"
ON public.contas_bancarias
FOR SELECT
USING (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "Only admins can manage contas_bancarias"
ON public.contas_bancarias
FOR ALL
USING (is_admin(auth.uid()));

-- Create trigger for updated_at on empresa_modulos
CREATE TRIGGER update_empresa_modulos_updated_at
BEFORE UPDATE ON public.empresa_modulos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on contas_bancarias
CREATE TRIGGER update_contas_bancarias_updated_at
BEFORE UPDATE ON public.contas_bancarias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();