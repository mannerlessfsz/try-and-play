
-- ============================================================================
-- FASE 3: Migração de dados — empresas → entities/accounts
-- ============================================================================

-- 3.1 Copiar empresas → entities
INSERT INTO public.entities (id, legal_name, trade_name, tax_id, email, phone, regime_tributario, is_active)
SELECT 
  e.id,  -- manter mesmo UUID para facilitar mapeamento
  e.nome,
  NULL,
  e.cnpj,
  e.email,
  e.telefone,
  e.regime_tributario,
  e.ativo
FROM public.empresas e
WHERE NOT EXISTS (SELECT 1 FROM public.entities WHERE id = e.id)
ON CONFLICT (id) DO NOTHING;

-- 3.2 Criar accounts para cada manager_id distinto (contratantes)
-- Cada manager vira owner de um account
INSERT INTO public.accounts (id, name, owner_user_id, status)
SELECT 
  gen_random_uuid(),
  COALESCE(p.full_name, 'Account ' || e.manager_id::text),
  e.manager_id,
  'active'
FROM (SELECT DISTINCT manager_id FROM public.empresas WHERE manager_id IS NOT NULL) e
LEFT JOIN public.profiles p ON p.id = e.manager_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounts a WHERE a.owner_user_id = e.manager_id
);

-- 3.3 Vincular entities a accounts via account_entities
-- Cada empresa é vinculada ao account do seu manager como 'self'
INSERT INTO public.account_entities (account_id, entity_id, relationship, is_active)
SELECT 
  a.id,
  e.id,
  'self'::account_entity_relationship,
  e.ativo
FROM public.empresas e
JOIN public.accounts a ON a.owner_user_id = e.manager_id
WHERE e.manager_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.account_entities ae 
  WHERE ae.account_id = a.id AND ae.entity_id = e.id
);

-- 3.4 Preencher legacy_entity_mapping
INSERT INTO public.legacy_entity_mapping (old_empresa_id, new_entity_id, new_account_id)
SELECT 
  e.id,
  e.id,  -- entity_id = empresa_id (mantivemos o mesmo UUID)
  a.id
FROM public.empresas e
JOIN public.accounts a ON a.owner_user_id = e.manager_id
WHERE e.manager_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.legacy_entity_mapping lem WHERE lem.old_empresa_id = e.id
);

-- 3.5 Atribuir roles aos usuários existentes
-- Owners (is_owner=true em user_empresas) → role 'manager'
-- Non-owners → role 'operator'
-- Master user → role 'owner' em todos os accounts
INSERT INTO public.user_account_roles (user_id, account_id, role, is_active)
SELECT DISTINCT
  ue.user_id,
  a.id,
  CASE 
    WHEN ue.is_owner THEN 'manager'::system_role
    ELSE 'operator'::system_role
  END,
  true
FROM public.user_empresas ue
JOIN public.empresas e ON e.id = ue.empresa_id
JOIN public.accounts a ON a.owner_user_id = e.manager_id
WHERE e.manager_id IS NOT NULL
AND ue.user_id != 'ea1c9a69-e436-4de2-953b-432e5fff60ae'  -- skip master
AND NOT EXISTS (
  SELECT 1 FROM public.user_account_roles uar 
  WHERE uar.user_id = ue.user_id AND uar.account_id = a.id
)
ON CONFLICT (user_id, account_id) DO NOTHING;

-- Account owners get 'owner' role on their own accounts
INSERT INTO public.user_account_roles (user_id, account_id, role, is_active)
SELECT 
  a.owner_user_id,
  a.id,
  'owner'::system_role,
  true
FROM public.accounts a
WHERE a.owner_user_id != 'ea1c9a69-e436-4de2-953b-432e5fff60ae'
AND NOT EXISTS (
  SELECT 1 FROM public.user_account_roles uar 
  WHERE uar.user_id = a.owner_user_id AND uar.account_id = a.id
)
ON CONFLICT (user_id, account_id) DO UPDATE SET role = 'owner';
