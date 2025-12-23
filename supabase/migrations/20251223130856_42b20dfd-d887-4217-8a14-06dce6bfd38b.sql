-- Add telefone field to empresas table
ALTER TABLE public.empresas ADD COLUMN telefone text;

-- Add manager_id field to link a manager user to each empresa
ALTER TABLE public.empresas ADD COLUMN manager_id uuid REFERENCES auth.users(id);

-- Create index for manager lookup
CREATE INDEX idx_empresas_manager_id ON public.empresas(manager_id);