-- Enum para papéis do sistema
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Enum para módulos do sistema
CREATE TYPE public.app_module AS ENUM ('taskvault', 'financialace', 'ajustasped', 'conferesped');

-- Enum para tipos de permissão
CREATE TYPE public.permission_type AS ENUM ('view', 'create', 'edit', 'delete', 'export');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de papéis de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tabela de associação usuário-empresa
CREATE TABLE public.user_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id)
);

ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;

-- Tabela de permissões granulares por módulo
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  permission permission_type NOT NULL,
  is_pro_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id, module, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem determinado papel (security definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Função para verificar se usuário tem acesso à empresa
CREATE OR REPLACE FUNCTION public.has_empresa_access(_user_id UUID, _empresa_id UUID)
RETURNS BOOLEAN
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
  ) OR public.is_admin(_user_id)
$$;

-- Função para verificar permissão específica
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _empresa_id UUID, _module app_module, _permission permission_type)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_admin(_user_id) 
    OR EXISTS (
      SELECT 1
      FROM public.user_permissions
      WHERE user_id = _user_id
        AND (empresa_id = _empresa_id OR empresa_id IS NULL)
        AND module = _module
        AND permission = _permission
    )
$$;

-- Função para verificar se usuário tem modo Pro no módulo
CREATE OR REPLACE FUNCTION public.has_pro_mode(_user_id UUID, _module app_module)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_admin(_user_id) 
    OR EXISTS (
      SELECT 1
      FROM public.user_permissions
      WHERE user_id = _user_id
        AND module = _module
        AND is_pro_mode = true
    )
$$;

-- Trigger para criar perfil automaticamente ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para updated_at nos profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = id);

-- RLS Policies para user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies para user_empresas
CREATE POLICY "Users can view own empresa associations"
  ON public.user_empresas FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can manage empresa associations"
  ON public.user_empresas FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies para user_permissions
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can manage permissions"
  ON public.user_permissions FOR ALL
  USING (public.is_admin(auth.uid()));

-- Atualizar RLS das tabelas existentes para respeitar multi-tenant

-- Atualizar tarefas para filtrar por empresa do usuário
DROP POLICY IF EXISTS "Anyone can view tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Anyone can insert tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Anyone can update tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Anyone can delete tarefas" ON public.tarefas;

CREATE POLICY "Users can view tarefas of their empresas"
  ON public.tarefas FOR SELECT
  USING (
    public.is_admin(auth.uid()) 
    OR public.has_empresa_access(auth.uid(), empresa_id)
  );

CREATE POLICY "Users can insert tarefas in their empresas"
  ON public.tarefas FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) 
    OR (
      public.has_empresa_access(auth.uid(), empresa_id)
      AND public.has_permission(auth.uid(), empresa_id, 'taskvault', 'create')
    )
  );

CREATE POLICY "Users can update tarefas in their empresas"
  ON public.tarefas FOR UPDATE
  USING (
    public.is_admin(auth.uid()) 
    OR (
      public.has_empresa_access(auth.uid(), empresa_id)
      AND public.has_permission(auth.uid(), empresa_id, 'taskvault', 'edit')
    )
  );

CREATE POLICY "Users can delete tarefas in their empresas"
  ON public.tarefas FOR DELETE
  USING (
    public.is_admin(auth.uid()) 
    OR (
      public.has_empresa_access(auth.uid(), empresa_id)
      AND public.has_permission(auth.uid(), empresa_id, 'taskvault', 'delete')
    )
  );

-- Atualizar empresas para filtrar por associação do usuário
DROP POLICY IF EXISTS "Anyone can view empresas" ON public.empresas;
DROP POLICY IF EXISTS "Anyone can insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Anyone can update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Anyone can delete empresas" ON public.empresas;

CREATE POLICY "Users can view their empresas"
  ON public.empresas FOR SELECT
  USING (
    public.is_admin(auth.uid()) 
    OR public.has_empresa_access(auth.uid(), id)
  );

CREATE POLICY "Only admins can insert empresas"
  ON public.empresas FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update empresas"
  ON public.empresas FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete empresas"
  ON public.empresas FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Atualizar atividades
DROP POLICY IF EXISTS "Anyone can view atividades" ON public.atividades;
DROP POLICY IF EXISTS "Anyone can insert atividades" ON public.atividades;
DROP POLICY IF EXISTS "Anyone can delete atividades" ON public.atividades;

CREATE POLICY "Users can view atividades of their empresas"
  ON public.atividades FOR SELECT
  USING (
    public.is_admin(auth.uid()) 
    OR public.has_empresa_access(auth.uid(), empresa_id)
  );

CREATE POLICY "Users can insert atividades in their empresas"
  ON public.atividades FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) 
    OR public.has_empresa_access(auth.uid(), empresa_id)
  );

CREATE POLICY "Users can delete atividades in their empresas"
  ON public.atividades FOR DELETE
  USING (
    public.is_admin(auth.uid()) 
    OR public.has_empresa_access(auth.uid(), empresa_id)
  );

-- Atualizar tarefa_arquivos
DROP POLICY IF EXISTS "Anyone can view tarefa_arquivos" ON public.tarefa_arquivos;
DROP POLICY IF EXISTS "Anyone can insert tarefa_arquivos" ON public.tarefa_arquivos;
DROP POLICY IF EXISTS "Anyone can update tarefa_arquivos" ON public.tarefa_arquivos;
DROP POLICY IF EXISTS "Anyone can delete tarefa_arquivos" ON public.tarefa_arquivos;

CREATE POLICY "Users can view tarefa_arquivos of their empresas"
  ON public.tarefa_arquivos FOR SELECT
  USING (
    public.is_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.tarefas t 
      WHERE t.id = tarefa_id 
      AND public.has_empresa_access(auth.uid(), t.empresa_id)
    )
  );

CREATE POLICY "Users can insert tarefa_arquivos in their empresas"
  ON public.tarefa_arquivos FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.tarefas t 
      WHERE t.id = tarefa_id 
      AND public.has_empresa_access(auth.uid(), t.empresa_id)
    )
  );

CREATE POLICY "Users can update tarefa_arquivos in their empresas"
  ON public.tarefa_arquivos FOR UPDATE
  USING (
    public.is_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.tarefas t 
      WHERE t.id = tarefa_id 
      AND public.has_empresa_access(auth.uid(), t.empresa_id)
    )
  );

CREATE POLICY "Users can delete tarefa_arquivos in their empresas"
  ON public.tarefa_arquivos FOR DELETE
  USING (
    public.is_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.tarefas t 
      WHERE t.id = tarefa_id 
      AND public.has_empresa_access(auth.uid(), t.empresa_id)
    )
  );