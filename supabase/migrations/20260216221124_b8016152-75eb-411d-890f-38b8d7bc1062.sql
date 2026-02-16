
-- ============================================================================
-- FASE 4: Reescrita Completa de Segurança
-- ============================================================================

-- 4.1 NOVAS FUNÇÕES
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_account_roles WHERE user_id = _user_id AND role = 'super_admin' AND is_active = true) $$;

CREATE OR REPLACE FUNCTION public.has_account_role(_user_id uuid, _account_id uuid, _role system_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.is_super_admin(_user_id) OR EXISTS (SELECT 1 FROM public.user_account_roles WHERE user_id = _user_id AND account_id = _account_id AND role = _role AND is_active = true) $$;

CREATE OR REPLACE FUNCTION public.has_account_access(_user_id uuid, _account_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.is_super_admin(_user_id) OR EXISTS (SELECT 1 FROM public.user_account_roles WHERE user_id = _user_id AND account_id = _account_id AND is_active = true) $$;

CREATE OR REPLACE FUNCTION public.has_entity_access(_user_id uuid, _entity_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.is_super_admin(_user_id) OR EXISTS (SELECT 1 FROM public.user_account_roles uar JOIN public.account_entities ae ON ae.account_id = uar.account_id WHERE uar.user_id = _user_id AND ae.entity_id = _entity_id AND uar.is_active = true AND ae.is_active = true) $$;

-- 4.2 ATUALIZAR FUNÇÕES EXISTENTES
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(_user_id, 'admin') OR public.is_super_admin(_user_id) $$;

CREATE OR REPLACE FUNCTION public.has_empresa_access(_user_id uuid, _empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.is_admin(_user_id) OR EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = _user_id AND empresa_id = _empresa_id) OR public.has_entity_access(_user_id, _empresa_id) $$;

CREATE OR REPLACE FUNCTION public.user_has_empresa_access(check_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_empresa_access(auth.uid(), check_empresa_id) $$;

CREATE OR REPLACE FUNCTION public.user_in_empresa(check_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_empresa_access(auth.uid(), check_empresa_id) $$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _empresa_id uuid, _module app_module, _permission permission_type)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.is_admin(_user_id) OR EXISTS (SELECT 1 FROM public.user_module_permissions WHERE user_id = _user_id AND (empresa_id = _empresa_id OR empresa_id IS NULL) AND module::text = _module::text AND CASE WHEN _permission = 'view' THEN can_view WHEN _permission = 'create' THEN can_create WHEN _permission = 'edit' THEN can_edit WHEN _permission = 'delete' THEN can_delete WHEN _permission = 'export' THEN can_export ELSE false END = true) $$;

CREATE OR REPLACE FUNCTION public.has_module_permission(p_user_id uuid, p_module text, p_action text DEFAULT 'view', p_empresa_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE v_has boolean; BEGIN IF public.is_admin(p_user_id) THEN RETURN true; END IF; SELECT CASE p_action WHEN 'view' THEN can_view WHEN 'create' THEN can_create WHEN 'edit' THEN can_edit WHEN 'delete' THEN can_delete WHEN 'export' THEN can_export ELSE false END INTO v_has FROM public.user_module_permissions WHERE user_id = p_user_id AND module = p_module AND ((empresa_id IS NULL AND p_empresa_id IS NULL) OR empresa_id = p_empresa_id); RETURN COALESCE(v_has, false); END; $$;

-- 4.3 RLS TABELAS NOVAS

-- user_account_roles
DROP POLICY IF EXISTS "Admins full access user_account_roles" ON public.user_account_roles;
DROP POLICY IF EXISTS "Deny anon user_account_roles" ON public.user_account_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_account_roles;
DROP POLICY IF EXISTS "Owner manage account roles" ON public.user_account_roles;
CREATE POLICY "anon_deny_uar" ON public.user_account_roles FOR SELECT TO anon USING (false);
CREATE POLICY "sa_full_uar" ON public.user_account_roles FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "admin_full_uar" ON public.user_account_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "self_view_uar" ON public.user_account_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_manage_uar" ON public.user_account_roles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = user_account_roles.account_id AND a.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = user_account_roles.account_id AND a.owner_user_id = auth.uid()));

-- accounts
DROP POLICY IF EXISTS "Admins full access accounts" ON public.accounts;
DROP POLICY IF EXISTS "Deny anon accounts" ON public.accounts;
DROP POLICY IF EXISTS "Owner can update own account" ON public.accounts;
DROP POLICY IF EXISTS "Owner can view own account" ON public.accounts;
CREATE POLICY "anon_deny_acc" ON public.accounts FOR SELECT TO anon USING (false);
CREATE POLICY "sa_full_acc" ON public.accounts FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "admin_full_acc" ON public.accounts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "owner_manage_acc" ON public.accounts FOR ALL TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "member_view_acc" ON public.accounts FOR SELECT TO authenticated USING (public.has_account_access(auth.uid(), id));

-- entities
DROP POLICY IF EXISTS "Admins full access entities" ON public.entities;
DROP POLICY IF EXISTS "Deny anon entities" ON public.entities;
DROP POLICY IF EXISTS "Owner view entities" ON public.entities;
DROP POLICY IF EXISTS "Owner manage entities" ON public.entities;
CREATE POLICY "anon_deny_ent" ON public.entities FOR SELECT TO anon USING (false);
CREATE POLICY "sa_full_ent" ON public.entities FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "admin_full_ent" ON public.entities FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "member_view_ent" ON public.entities FOR SELECT TO authenticated USING (public.has_entity_access(auth.uid(), id));
CREATE POLICY "owner_manage_ent" ON public.entities FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.account_entities ae JOIN public.accounts a ON a.id = ae.account_id WHERE ae.entity_id = entities.id AND a.owner_user_id = auth.uid() AND ae.is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM public.account_entities ae JOIN public.accounts a ON a.id = ae.account_id WHERE ae.entity_id = entities.id AND a.owner_user_id = auth.uid() AND ae.is_active = true));

-- account_entities
DROP POLICY IF EXISTS "Admins full access account_entities" ON public.account_entities;
DROP POLICY IF EXISTS "Deny anon account_entities" ON public.account_entities;
DROP POLICY IF EXISTS "Owner manage account_entities" ON public.account_entities;
DROP POLICY IF EXISTS "Owner view account_entities" ON public.account_entities;
CREATE POLICY "anon_deny_ae" ON public.account_entities FOR SELECT TO anon USING (false);
CREATE POLICY "sa_full_ae" ON public.account_entities FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "admin_full_ae" ON public.account_entities FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "owner_manage_ae" ON public.account_entities FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_entities.account_id AND a.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_entities.account_id AND a.owner_user_id = auth.uid()));
CREATE POLICY "member_view_ae" ON public.account_entities FOR SELECT TO authenticated USING (public.has_account_access(auth.uid(), account_id));

-- entity_module_access
DROP POLICY IF EXISTS "Admins full access entity_module_access" ON public.entity_module_access;
DROP POLICY IF EXISTS "Members view entity_module_access" ON public.entity_module_access;
DROP POLICY IF EXISTS "Owner manage entity_module_access" ON public.entity_module_access;
CREATE POLICY "sa_full_ema" ON public.entity_module_access FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "admin_full_ema" ON public.entity_module_access FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "owner_manage_ema" ON public.entity_module_access FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.account_entities ae JOIN public.accounts a ON a.id = ae.account_id WHERE ae.id = entity_module_access.account_entity_id AND a.owner_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.account_entities ae JOIN public.accounts a ON a.id = ae.account_id WHERE ae.id = entity_module_access.account_entity_id AND a.owner_user_id = auth.uid()));
CREATE POLICY "member_view_ema" ON public.entity_module_access FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.account_entities ae JOIN public.user_account_roles uar ON uar.account_id = ae.account_id WHERE ae.id = entity_module_access.account_entity_id AND uar.user_id = auth.uid() AND uar.is_active = true));

-- domain_events
DROP POLICY IF EXISTS "Admins full access domain_events" ON public.domain_events;
DROP POLICY IF EXISTS "Deny anon domain_events" ON public.domain_events;
DROP POLICY IF EXISTS "Owner manage domain_events" ON public.domain_events;
DROP POLICY IF EXISTS "Account members view events" ON public.domain_events;
DROP POLICY IF EXISTS "Account members insert events" ON public.domain_events;
CREATE POLICY "anon_deny_de" ON public.domain_events FOR SELECT TO anon USING (false);
CREATE POLICY "sa_full_de" ON public.domain_events FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "admin_full_de" ON public.domain_events FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "member_view_de" ON public.domain_events FOR SELECT TO authenticated USING (public.has_account_access(auth.uid(), account_id));
CREATE POLICY "member_insert_de" ON public.domain_events FOR INSERT TO authenticated WITH CHECK (public.has_account_access(auth.uid(), account_id));

-- legacy_entity_mapping
DROP POLICY IF EXISTS "Only admins legacy_mapping" ON public.legacy_entity_mapping;
CREATE POLICY "admin_full_lem" ON public.legacy_entity_mapping FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "anon_deny_lem" ON public.legacy_entity_mapping FOR SELECT TO anon USING (false);

-- permissions_catalog
DROP POLICY IF EXISTS "Admins manage permissions_catalog" ON public.permissions_catalog;
DROP POLICY IF EXISTS "Authenticated can view permissions_catalog" ON public.permissions_catalog;
CREATE POLICY "admin_manage_pc" ON public.permissions_catalog FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "auth_view_pc" ON public.permissions_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon_deny_pc" ON public.permissions_catalog FOR SELECT TO anon USING (false);

-- role_permissions
DROP POLICY IF EXISTS "Admins full access role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Owner manage role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users view role_permissions of own account" ON public.role_permissions;
CREATE POLICY "admin_manage_rp" ON public.role_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "auth_view_rp" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon_deny_rp" ON public.role_permissions FOR SELECT TO anon USING (false);

NOTIFY pgrst, 'reload schema';
