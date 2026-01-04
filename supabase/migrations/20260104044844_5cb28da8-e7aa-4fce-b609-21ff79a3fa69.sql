-- Add user_id column to atividades for per-user tracking
ALTER TABLE public.atividades 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add module column to identify which module generated the activity
ALTER TABLE public.atividades 
ADD COLUMN IF NOT EXISTS modulo TEXT;

-- Add metadata column for additional context
ALTER TABLE public.atividades 
ADD COLUMN IF NOT EXISTS metadados JSONB;

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_atividades_user_id ON public.atividades(user_id);

-- Create index for faster queries by module
CREATE INDEX IF NOT EXISTS idx_atividades_modulo ON public.atividades(modulo);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_atividades_created_at ON public.atividades(created_at DESC);

-- Update RLS policies to include user-based access
DROP POLICY IF EXISTS "Users can view atividades" ON public.atividades;
DROP POLICY IF EXISTS "Users can insert atividades" ON public.atividades;

-- Allow users to view their own activities or activities from companies they have access to
CREATE POLICY "Users can view atividades" ON public.atividades
FOR SELECT USING (
  auth.uid() = user_id 
  OR empresa_id IN (
    SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to insert activities
CREATE POLICY "Users can insert atividades" ON public.atividades
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own activities
CREATE POLICY "Users can update their atividades" ON public.atividades
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own activities
CREATE POLICY "Users can delete their atividades" ON public.atividades
FOR DELETE USING (auth.uid() = user_id);