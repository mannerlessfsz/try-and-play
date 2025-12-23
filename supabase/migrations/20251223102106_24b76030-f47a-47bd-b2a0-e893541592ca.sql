-- Tabela de empresas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Policies for empresas (public for now, can be restricted later with auth)
CREATE POLICY "Anyone can view empresas" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert empresas" ON public.empresas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update empresas" ON public.empresas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete empresas" ON public.empresas FOR DELETE USING (true);

-- Tabela de tarefas
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  data_vencimento TIMESTAMP WITH TIME ZONE,
  progresso INTEGER DEFAULT 0,
  responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Policies for tarefas (public for now, can be restricted later with auth)
CREATE POLICY "Anyone can view tarefas" ON public.tarefas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tarefas" ON public.tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tarefas" ON public.tarefas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tarefas" ON public.tarefas FOR DELETE USING (true);

-- Tabela de arquivos de tarefas
CREATE TABLE public.tarefa_arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefa_arquivos ENABLE ROW LEVEL SECURITY;

-- Policies for tarefa_arquivos
CREATE POLICY "Anyone can view tarefa_arquivos" ON public.tarefa_arquivos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tarefa_arquivos" ON public.tarefa_arquivos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tarefa_arquivos" ON public.tarefa_arquivos FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tarefa_arquivos" ON public.tarefa_arquivos FOR DELETE USING (true);

-- Tabela de atividades
CREATE TABLE public.atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- Policies for atividades
CREATE POLICY "Anyone can view atividades" ON public.atividades FOR SELECT USING (true);
CREATE POLICY "Anyone can insert atividades" ON public.atividades FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete atividades" ON public.atividades FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public) VALUES ('task-files', 'task-files', true);

-- Storage policies
CREATE POLICY "Anyone can view task files" ON storage.objects FOR SELECT USING (bucket_id = 'task-files');
CREATE POLICY "Anyone can upload task files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-files');
CREATE POLICY "Anyone can delete task files" ON storage.objects FOR DELETE USING (bucket_id = 'task-files');