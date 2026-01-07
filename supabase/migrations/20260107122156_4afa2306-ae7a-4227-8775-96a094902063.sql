-- Enum para tipo de conversa
CREATE TYPE public.conversation_type AS ENUM ('direct', 'group', 'channel');

-- Enum para status de presença
CREATE TYPE public.presence_status AS ENUM ('online', 'away', 'busy', 'in_meeting', 'offline');

-- Tabela de conversas (DMs, grupos, canais)
CREATE TABLE public.messenger_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  type conversation_type NOT NULL DEFAULT 'direct',
  name TEXT, -- null para DMs, nome para grupos/canais
  description TEXT,
  avatar_url TEXT,
  departamento public.departamento_tipo, -- para canais de departamento
  is_private BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Participantes das conversas
CREATE TABLE public.messenger_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.messenger_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  is_muted BOOLEAN DEFAULT false,
  last_read_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Mensagens
CREATE TABLE public.messenger_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.messenger_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'audio', 'system'
  file_url TEXT,
  file_name TEXT,
  reply_to_id UUID REFERENCES public.messenger_messages(id),
  mentions UUID[], -- array de user_ids mencionados
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Status de presença dos usuários
CREATE TABLE public.messenger_presence (
  user_id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  status presence_status DEFAULT 'offline',
  status_message TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contatos externos (clientes/fornecedores para WhatsApp Business)
CREATE TABLE public.messenger_external_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.messenger_conversations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  tag TEXT, -- 'cliente', 'fornecedor'
  cliente_id UUID REFERENCES public.clientes(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  whatsapp_id TEXT, -- ID do WhatsApp Business API
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_messenger_messages_conversation ON public.messenger_messages(conversation_id);
CREATE INDEX idx_messenger_messages_sender ON public.messenger_messages(sender_id);
CREATE INDEX idx_messenger_messages_created ON public.messenger_messages(created_at DESC);
CREATE INDEX idx_messenger_participants_user ON public.messenger_participants(user_id);
CREATE INDEX idx_messenger_conversations_empresa ON public.messenger_conversations(empresa_id);
CREATE INDEX idx_messenger_external_empresa ON public.messenger_external_contacts(empresa_id);

-- Enable RLS
ALTER TABLE public.messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_external_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Conversations: users can see conversations they participate in
CREATE POLICY "Users can view conversations they participate in"
ON public.messenger_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messenger_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  )
  OR
  (type = 'channel' AND is_private = false AND EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE empresa_id = messenger_conversations.empresa_id AND user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create conversations"
ON public.messenger_conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE empresa_id = messenger_conversations.empresa_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update conversations"
ON public.messenger_conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.messenger_participants
    WHERE conversation_id = id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- Participants
CREATE POLICY "Users can view participants of their conversations"
ON public.messenger_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.messenger_participants p2
    WHERE p2.conversation_id = conversation_id AND p2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage participants in conversations they admin"
ON public.messenger_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.messenger_participants
    WHERE conversation_id = messenger_participants.conversation_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messenger_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messenger_participants
    WHERE conversation_id = messenger_messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messenger_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM public.messenger_participants
    WHERE conversation_id = messenger_messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can edit their own messages"
ON public.messenger_messages FOR UPDATE
USING (sender_id = auth.uid());

-- Presence
CREATE POLICY "Users can view presence of company members"
ON public.messenger_presence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas ue1
    JOIN public.user_empresas ue2 ON ue1.empresa_id = ue2.empresa_id
    WHERE ue1.user_id = auth.uid() AND ue2.user_id = messenger_presence.user_id
  )
);

CREATE POLICY "Users can update their own presence"
ON public.messenger_presence FOR ALL
USING (user_id = auth.uid());

-- External contacts
CREATE POLICY "Users can view external contacts of their companies"
ON public.messenger_external_contacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE empresa_id = messenger_external_contacts.empresa_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage external contacts of their companies"
ON public.messenger_external_contacts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE empresa_id = messenger_external_contacts.empresa_id AND user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_presence;

-- Trigger for updated_at
CREATE TRIGGER update_messenger_conversations_updated_at
  BEFORE UPDATE ON public.messenger_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messenger_messages_updated_at
  BEFORE UPDATE ON public.messenger_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messenger_external_contacts_updated_at
  BEFORE UPDATE ON public.messenger_external_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();