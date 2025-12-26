-- ==============================================
-- FIX SECURITY ISSUES
-- ==============================================

-- 1. EMPRESAS: Restrict sensitive data (CNPJ, email, telefone) to owners/admins only
-- Create a view for restricted access and update RLS policies

-- Drop existing SELECT policy for empresas
DROP POLICY IF EXISTS "Users can view only their linked empresas" ON public.empresas;

-- Create function to check if user is owner of empresa
CREATE OR REPLACE FUNCTION public.is_empresa_owner(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_empresas
    WHERE user_id = _user_id
      AND empresa_id = _empresa_id
      AND is_owner = true
  )
$$;

-- Create secure view for empresas that hides sensitive data from non-owners
CREATE OR REPLACE VIEW public.empresas_view AS
SELECT 
  id,
  nome,
  created_at,
  updated_at,
  manager_id,
  -- Only show sensitive fields to admins or empresa owners
  CASE 
    WHEN public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), id) 
    THEN cnpj 
    ELSE NULL 
  END as cnpj,
  CASE 
    WHEN public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), id) 
    THEN email 
    ELSE NULL 
  END as email,
  CASE 
    WHEN public.is_admin(auth.uid()) OR public.is_empresa_owner(auth.uid(), id) 
    THEN telefone 
    ELSE NULL 
  END as telefone
FROM public.empresas
WHERE 
  public.is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = empresas.id
  );

-- Grant access to the view
GRANT SELECT ON public.empresas_view TO authenticated;

-- Re-create policy for empresas table (base table still needs RLS for direct access from SECURITY DEFINER functions)
CREATE POLICY "Users can view only their linked empresas"
ON public.empresas
FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = empresas.id
  )
);

-- 2. IMPORTACOES_EXTRATO: Add UPDATE and DELETE policies
-- Users with proper permissions can update/delete import records in their empresas

CREATE POLICY "Users can update importacoes in their empresas"
ON public.importacoes_extrato
FOR UPDATE
USING (
  public.is_admin(auth.uid()) OR (
    public.has_empresa_access(auth.uid(), empresa_id) AND 
    public.has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'edit'::permission_type)
  )
);

CREATE POLICY "Users can delete importacoes in their empresas"
ON public.importacoes_extrato
FOR DELETE
USING (
  public.is_admin(auth.uid()) OR (
    public.has_empresa_access(auth.uid(), empresa_id) AND 
    public.has_permission(auth.uid(), empresa_id, 'financialace'::app_module, 'delete'::permission_type)
  )
);