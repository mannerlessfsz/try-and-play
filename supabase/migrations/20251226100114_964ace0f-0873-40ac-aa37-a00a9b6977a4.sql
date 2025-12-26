-- Fix task-files storage bucket security
-- 1. Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'task-files';

-- 2. Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view task files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload task files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete task files" ON storage.objects;

-- 3. Create secure empresa-scoped policies
CREATE POLICY "Users can view task files of their empresas"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-files' AND
  (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tarefa_arquivos ta
      JOIN public.tarefas t ON t.id = ta.tarefa_id
      WHERE public.has_empresa_access(auth.uid(), t.empresa_id)
      AND ta.url LIKE '%' || storage.objects.name
    )
  )
);

CREATE POLICY "Users can upload task files to their empresas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-files' AND
  (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid()
      AND public.has_permission(auth.uid(), ue.empresa_id, 'taskvault'::app_module, 'create'::permission_type)
    )
  )
);

CREATE POLICY "Users can delete task files from their empresas"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-files' AND
  (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tarefa_arquivos ta
      JOIN public.tarefas t ON t.id = ta.tarefa_id
      WHERE public.has_empresa_access(auth.uid(), t.empresa_id)
      AND public.has_permission(auth.uid(), t.empresa_id, 'taskvault'::app_module, 'delete'::permission_type)
      AND ta.url LIKE '%' || storage.objects.name
    )
  )
);