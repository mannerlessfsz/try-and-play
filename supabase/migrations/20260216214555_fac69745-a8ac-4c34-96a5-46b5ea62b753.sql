
-- ============================================================================
-- FASE 2: RBAC/ABAC Infrastructure (retry — sem AS RESTRICTIVE)
-- ============================================================================

-- Enums já criados na tentativa anterior, recriar apenas se não existem
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'system_role') THEN
    CREATE TYPE public.system_role AS ENUM ('owner','admin','manager','operator','viewer','client_portal');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_effect') THEN
    CREATE TYPE public.permission_effect AS ENUM ('allow','deny');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_access_level') THEN
    CREATE TYPE public.entity_access_level AS ENUM ('deliver_only','portal','full');
  END IF;
END $$;

-- Tabelas já criadas na tentativa anterior, recriar apenas se não existem

CREATE TABLE IF NOT EXISTS public.permissions_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  sub_module TEXT,
  resource TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_permissions_catalog_module ON public.permissions_catalog(module);
CREATE INDEX IF NOT EXISTS idx_permissions_catalog_code ON public.permissions_catalog(code);

CREATE TABLE IF NOT EXISTS public.user_account_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  role public.system_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id)
);
CREATE INDEX IF NOT EXISTS idx_user_account_roles_user ON public.user_account_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_account_roles_account ON public.user_account_roles(account_id);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  role public.system_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions_catalog(id) ON DELETE CASCADE,
  effect public.permission_effect NOT NULL DEFAULT 'allow',
  conditions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, role, permission_id)
);
CREATE INDEX IF NOT EXISTS idx_role_permissions_account_role ON public.role_permissions(account_id, role);

CREATE TABLE IF NOT EXISTS public.entity_module_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_entity_id UUID NOT NULL REFERENCES public.account_entities(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  access_level public.entity_access_level NOT NULL DEFAULT 'full',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_entity_id, module)
);
CREATE INDEX IF NOT EXISTS idx_entity_module_access_ae ON public.entity_module_access(account_entity_id);

-- Triggers (skip if already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_account_roles_updated_at') THEN
    CREATE TRIGGER update_user_account_roles_updated_at
      BEFORE UPDATE ON public.user_account_roles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_entity_module_access_updated_at') THEN
    CREATE TRIGGER update_entity_module_access_updated_at
      BEFORE UPDATE ON public.entity_module_access
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- RLS (sem AS RESTRICTIVE — usar bloqueio anon via role check)
-- ============================================================================

-- permissions_catalog
ALTER TABLE public.permissions_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view permissions_catalog"
  ON public.permissions_catalog FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage permissions_catalog"
  ON public.permissions_catalog FOR ALL
  USING (is_admin(auth.uid()));

-- user_account_roles
ALTER TABLE public.user_account_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own roles"
  ON public.user_account_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins full access user_account_roles"
  ON public.user_account_roles FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Owner manage account roles"
  ON public.user_account_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = user_account_roles.account_id
        AND a.owner_user_id = auth.uid()
    )
  );

-- role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view role_permissions of own account"
  ON public.role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_account_roles uar
      WHERE uar.account_id = role_permissions.account_id
        AND uar.user_id = auth.uid()
        AND uar.is_active = true
    )
  );

CREATE POLICY "Admins full access role_permissions"
  ON public.role_permissions FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Owner manage role_permissions"
  ON public.role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = role_permissions.account_id
        AND a.owner_user_id = auth.uid()
    )
  );

-- entity_module_access
ALTER TABLE public.entity_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access entity_module_access"
  ON public.entity_module_access FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Owner manage entity_module_access"
  ON public.entity_module_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.account_entities ae
      JOIN public.accounts a ON a.id = ae.account_id
      WHERE ae.id = entity_module_access.account_entity_id
        AND a.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Members view entity_module_access"
  ON public.entity_module_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_entities ae
      JOIN public.user_account_roles uar ON uar.account_id = ae.account_id
      WHERE ae.id = entity_module_access.account_entity_id
        AND uar.user_id = auth.uid()
        AND uar.is_active = true
    )
  );

-- ============================================================================
-- Seed permissões (idempotente via ON CONFLICT)
-- ============================================================================
INSERT INTO public.permissions_catalog (code, module, sub_module, resource, description) VALUES
  ('taskvault.tasks.view',       'taskvault', 'tasks',    'view',    'Ver tarefas'),
  ('taskvault.tasks.create',     'taskvault', 'tasks',    'create',  'Criar tarefas'),
  ('taskvault.tasks.edit',       'taskvault', 'tasks',    'edit',    'Editar tarefas'),
  ('taskvault.tasks.delete',     'taskvault', 'tasks',    'delete',  'Excluir tarefas'),
  ('taskvault.tasks.export',     'taskvault', 'tasks',    'export',  'Exportar tarefas'),
  ('gestao.fin.view',            'gestao',    'fin',      'view',    'Ver financeiro'),
  ('gestao.fin.create',          'gestao',    'fin',      'create',  'Criar transações'),
  ('gestao.fin.edit',            'gestao',    'fin',      'edit',    'Editar transações'),
  ('gestao.fin.delete',          'gestao',    'fin',      'delete',  'Excluir transações'),
  ('gestao.fin.reconcile',       'gestao',    'fin',      'reconcile','Conciliar extratos'),
  ('gestao.fin.export',          'gestao',    'fin',      'export',  'Exportar financeiro'),
  ('gestao.erp.view',            'gestao',    'erp',      'view',    'Ver ERP'),
  ('gestao.erp.create',          'gestao',    'erp',      'create',  'Criar registros ERP'),
  ('gestao.erp.edit',            'gestao',    'erp',      'edit',    'Editar registros ERP'),
  ('gestao.erp.delete',          'gestao',    'erp',      'delete',  'Excluir registros ERP'),
  ('gestao.erp.export',          'gestao',    'erp',      'export',  'Exportar ERP'),
  ('conversores.convert.view',   'conversores','convert', 'view',    'Ver conversores'),
  ('conversores.convert.create', 'conversores','convert', 'create',  'Executar conversões'),
  ('conversores.convert.export', 'conversores','convert', 'export',  'Exportar conversões'),
  ('messenger.chat.view',        'messenger', 'chat',     'view',    'Ver conversas'),
  ('messenger.chat.create',      'messenger', 'chat',     'create',  'Criar mensagens'),
  ('messenger.chat.delete',      'messenger', 'chat',     'delete',  'Excluir mensagens')
ON CONFLICT (code) DO NOTHING;
