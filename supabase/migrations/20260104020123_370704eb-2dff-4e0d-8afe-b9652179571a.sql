-- Create table for storing conversion history
CREATE TABLE public.conversoes_arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL, -- 'lider', 'casa', 'extrato', etc.
  nome_arquivo_original TEXT NOT NULL,
  nome_arquivo_convertido TEXT,
  arquivo_original_url TEXT,
  arquivo_convertido_url TEXT,
  total_linhas INTEGER DEFAULT 0,
  linhas_processadas INTEGER DEFAULT 0,
  linhas_erro INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processando', -- 'processando', 'sucesso', 'erro'
  mensagem_erro TEXT,
  metadados JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.conversoes_arquivos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view conversions from their companies"
ON public.conversoes_arquivos FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  public.has_empresa_access(auth.uid(), empresa_id)
);

CREATE POLICY "Users can create conversions for their companies"
ON public.conversoes_arquivos FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) OR
  public.has_empresa_access(auth.uid(), empresa_id)
);

CREATE POLICY "Users can update conversions from their companies"
ON public.conversoes_arquivos FOR UPDATE
USING (
  public.is_admin(auth.uid()) OR
  public.has_empresa_access(auth.uid(), empresa_id)
);

CREATE POLICY "Users can delete conversions from their companies"
ON public.conversoes_arquivos FOR DELETE
USING (
  public.is_admin(auth.uid()) OR
  public.has_empresa_access(auth.uid(), empresa_id)
);

-- Create storage bucket for conversion files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('conversoes', 'conversoes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view conversion files from their companies"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'conversoes' AND
  (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.conversoes_arquivos ca
      JOIN public.user_empresas ue ON ue.empresa_id = ca.empresa_id
      WHERE ue.user_id = auth.uid()
      AND (
        ca.arquivo_original_url LIKE '%' || name OR
        ca.arquivo_convertido_url LIKE '%' || name
      )
    )
  )
);

CREATE POLICY "Users can upload conversion files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'conversoes' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete conversion files from their companies"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'conversoes' AND
  (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.conversoes_arquivos ca
      JOIN public.user_empresas ue ON ue.empresa_id = ca.empresa_id
      WHERE ue.user_id = auth.uid()
      AND (
        ca.arquivo_original_url LIKE '%' || name OR
        ca.arquivo_convertido_url LIKE '%' || name
      )
    )
  )
);

-- Index for performance
CREATE INDEX idx_conversoes_arquivos_empresa ON public.conversoes_arquivos(empresa_id);
CREATE INDEX idx_conversoes_arquivos_modulo ON public.conversoes_arquivos(modulo);
CREATE INDEX idx_conversoes_arquivos_created ON public.conversoes_arquivos(created_at DESC);