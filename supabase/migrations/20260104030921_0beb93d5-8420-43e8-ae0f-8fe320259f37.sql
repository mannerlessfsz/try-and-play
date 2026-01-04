-- Create audit log table for permission changes
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Anyone authenticated can insert (for triggers)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create notifications table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  dados JSONB,
  lida BOOLEAN DEFAULT false,
  lida_por UUID,
  lida_em TIMESTAMPTZ,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all notifications
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Function to log permission changes
CREATE OR REPLACE FUNCTION public.log_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, details)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      'Permissão criada'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, details)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      'Permissão atualizada'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, details)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      'Permissão removida'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for permission tables
CREATE TRIGGER audit_user_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

CREATE TRIGGER audit_user_resource_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.user_resource_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

CREATE TRIGGER audit_permission_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.permission_profiles
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

CREATE TRIGGER audit_permission_profile_items
AFTER INSERT OR UPDATE OR DELETE ON public.permission_profile_items
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

-- Function to create notification for new user
CREATE OR REPLACE FUNCTION public.notify_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (tipo, titulo, mensagem, dados)
  VALUES (
    'novo_usuario',
    'Novo Usuário Cadastrado',
    'O usuário ' || COALESCE(NEW.full_name, NEW.email) || ' acabou de se cadastrar.',
    jsonb_build_object('user_id', NEW.id, 'email', NEW.email, 'full_name', NEW.full_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_new_user
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_new_user();

-- Function to notify low stock
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estoque_atual IS NOT NULL AND NEW.estoque_minimo IS NOT NULL 
     AND NEW.estoque_atual <= NEW.estoque_minimo 
     AND NEW.controla_estoque = true THEN
    INSERT INTO public.admin_notifications (tipo, titulo, mensagem, dados, empresa_id)
    VALUES (
      'estoque_baixo',
      'Produto com Estoque Baixo',
      'O produto "' || NEW.nome || '" está com estoque baixo (' || NEW.estoque_atual || ' unidades).',
      jsonb_build_object('produto_id', NEW.id, 'nome', NEW.nome, 'estoque_atual', NEW.estoque_atual, 'estoque_minimo', NEW.estoque_minimo),
      NEW.empresa_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_low_stock
AFTER UPDATE OF estoque_atual ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();

-- Function to notify pending transactions
CREATE OR REPLACE FUNCTION public.notify_pending_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pendente' AND NEW.valor >= 1000 THEN
    INSERT INTO public.admin_notifications (tipo, titulo, mensagem, dados, empresa_id)
    VALUES (
      'transacao_pendente',
      'Transação Pendente de Alto Valor',
      'Nova transação pendente de R$ ' || ROUND(NEW.valor::numeric, 2) || ' - ' || NEW.descricao,
      jsonb_build_object('transacao_id', NEW.id, 'valor', NEW.valor, 'tipo', NEW.tipo, 'descricao', NEW.descricao),
      NEW.empresa_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_pending_transaction
AFTER INSERT ON public.transacoes
FOR EACH ROW EXECUTE FUNCTION public.notify_pending_transaction();

-- Create index for better query performance
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_lida ON public.admin_notifications(lida);
CREATE INDEX idx_admin_notifications_tipo ON public.admin_notifications(tipo);