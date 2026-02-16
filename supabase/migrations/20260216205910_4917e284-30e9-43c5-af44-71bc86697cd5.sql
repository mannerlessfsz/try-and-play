
-- ============================================================================
-- FASE 1: TABELAS FUNDACIONAIS — Account/Entity Architecture
-- ============================================================================

-- 1. ENUMS
CREATE TYPE public.account_entity_relationship AS ENUM ('self', 'client');
CREATE TYPE public.account_status AS ENUM ('active', 'suspended', 'cancelled');

-- 2. TABELAS (sem policies cross-table ainda)

-- ACCOUNTS
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_user_id UUID NOT NULL,
  status public.account_status NOT NULL DEFAULT 'active',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_accounts_owner ON public.accounts(owner_user_id);
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ENTITIES
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  regime_tributario public.regime_tributario,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entities_tax_id ON public.entities(tax_id);
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ACCOUNT_ENTITIES
CREATE TABLE public.account_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship public.account_entity_relationship NOT NULL DEFAULT 'client',
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, entity_id)
);
CREATE INDEX idx_ae_account ON public.account_entities(account_id);
CREATE INDEX idx_ae_entity ON public.account_entities(entity_id);
CREATE TRIGGER update_account_entities_updated_at BEFORE UPDATE ON public.account_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DOMAIN_EVENTS
CREATE TABLE public.domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_module TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_de_account ON public.domain_events(account_id);
CREATE INDEX idx_de_type ON public.domain_events(event_type);
CREATE INDEX idx_de_unprocessed ON public.domain_events(processed) WHERE processed = false;

-- LEGACY_ENTITY_MAPPING
CREATE TABLE public.legacy_entity_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_empresa_id UUID NOT NULL,
  new_entity_id UUID NOT NULL REFERENCES public.entities(id),
  new_account_id UUID NOT NULL REFERENCES public.accounts(id),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(old_empresa_id)
);

-- 3. ENABLE RLS em todas
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_entity_mapping ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (agora todas as tabelas existem)

-- ACCOUNTS
CREATE POLICY "Deny anon accounts" ON public.accounts FOR SELECT TO anon USING (false);
CREATE POLICY "Admins full access accounts" ON public.accounts FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Owner can view own account" ON public.accounts FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own account" ON public.accounts FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());

-- ENTITIES
CREATE POLICY "Deny anon entities" ON public.entities FOR SELECT TO anon USING (false);
CREATE POLICY "Admins full access entities" ON public.entities FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users view linked entities" ON public.entities FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.account_entities ae
    JOIN public.accounts a ON a.id = ae.account_id
    WHERE ae.entity_id = entities.id AND a.owner_user_id = auth.uid()
  ));

-- ACCOUNT_ENTITIES
CREATE POLICY "Deny anon account_entities" ON public.account_entities FOR SELECT TO anon USING (false);
CREATE POLICY "Admins full access account_entities" ON public.account_entities FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Owner manage account_entities" ON public.account_entities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_entities.account_id AND a.owner_user_id = auth.uid()));
CREATE POLICY "Owner view account_entities" ON public.account_entities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_entities.account_id AND a.owner_user_id = auth.uid()));

-- DOMAIN_EVENTS
CREATE POLICY "Deny anon domain_events" ON public.domain_events FOR SELECT TO anon USING (false);
CREATE POLICY "Admins full access domain_events" ON public.domain_events FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Owner manage domain_events" ON public.domain_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = domain_events.account_id AND a.owner_user_id = auth.uid()));

-- LEGACY_ENTITY_MAPPING
CREATE POLICY "Only admins legacy_mapping" ON public.legacy_entity_mapping FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
