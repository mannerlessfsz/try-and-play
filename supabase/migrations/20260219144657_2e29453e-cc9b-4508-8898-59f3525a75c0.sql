
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view regras of their empresas" ON public.regras_exclusao_lider;
DROP POLICY IF EXISTS "Users can insert regras in their empresas" ON public.regras_exclusao_lider;
DROP POLICY IF EXISTS "Users can update regras in their empresas" ON public.regras_exclusao_lider;
DROP POLICY IF EXISTS "Users can delete regras in their empresas" ON public.regras_exclusao_lider;

-- New policies: authenticated users with conversores permission can manage rules
CREATE POLICY "Users can view regras"
ON public.regras_exclusao_lider FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_module_permission(auth.uid(), 'conversores', 'view')
);

CREATE POLICY "Users can insert regras"
ON public.regras_exclusao_lider FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_module_permission(auth.uid(), 'conversores', 'create')
);

CREATE POLICY "Users can update regras"
ON public.regras_exclusao_lider FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_module_permission(auth.uid(), 'conversores', 'edit')
);

CREATE POLICY "Users can delete regras"
ON public.regras_exclusao_lider FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_module_permission(auth.uid(), 'conversores', 'delete')
);
