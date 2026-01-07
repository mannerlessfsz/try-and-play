-- Drop ALL existing messenger policies to start fresh
DROP POLICY IF EXISTS "Admins can update conversations" ON messenger_conversations;
DROP POLICY IF EXISTS "Creators can update their conversations" ON messenger_conversations;
DROP POLICY IF EXISTS "Users can create company conversations" ON messenger_conversations;
DROP POLICY IF EXISTS "Users can view company conversations" ON messenger_conversations;

DROP POLICY IF EXISTS "Users can manage external contacts of their companies" ON messenger_external_contacts;
DROP POLICY IF EXISTS "Users can view external contacts of their companies" ON messenger_external_contacts;

DROP POLICY IF EXISTS "Users can edit their own messages" ON messenger_messages;
DROP POLICY IF EXISTS "Users can send messages in company conversations" ON messenger_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messenger_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messenger_messages;
DROP POLICY IF EXISTS "Users can view messages in company conversations" ON messenger_messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messenger_messages;

DROP POLICY IF EXISTS "Admins can manage participants" ON messenger_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON messenger_participants;
DROP POLICY IF EXISTS "Users can manage participants in conversations they admin" ON messenger_participants;
DROP POLICY IF EXISTS "Users can view participants" ON messenger_participants;

DROP POLICY IF EXISTS "Users can manage their own presence" ON messenger_presence;
DROP POLICY IF EXISTS "Users can view presence in their companies" ON messenger_presence;

-- Create a helper function to check if user has empresa access (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.user_in_empresa(check_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_empresas
      WHERE user_id = auth.uid()
      AND empresa_id = check_empresa_id
    )
$$;

-- MESSENGER_CONVERSATIONS - Simple policies
CREATE POLICY "messenger_conv_select" ON messenger_conversations
FOR SELECT USING (public.user_in_empresa(empresa_id));

CREATE POLICY "messenger_conv_insert" ON messenger_conversations
FOR INSERT WITH CHECK (
  public.user_in_empresa(empresa_id) 
  AND created_by = auth.uid()
);

CREATE POLICY "messenger_conv_update" ON messenger_conversations
FOR UPDATE USING (
  created_by = auth.uid() 
  OR public.is_admin(auth.uid())
);

CREATE POLICY "messenger_conv_delete" ON messenger_conversations
FOR DELETE USING (
  created_by = auth.uid() 
  OR public.is_admin(auth.uid())
);

-- MESSENGER_PARTICIPANTS - Simple policies without self-reference
CREATE POLICY "messenger_part_select" ON messenger_participants
FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND public.user_in_empresa(mc.empresa_id)
  )
);

CREATE POLICY "messenger_part_insert" ON messenger_participants
FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND public.user_in_empresa(mc.empresa_id)
  )
);

CREATE POLICY "messenger_part_delete" ON messenger_participants
FOR DELETE USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND mc.created_by = auth.uid()
  )
);

-- MESSENGER_MESSAGES - Simple policies
CREATE POLICY "messenger_msg_select" ON messenger_messages
FOR SELECT USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND public.user_in_empresa(mc.empresa_id)
  )
);

CREATE POLICY "messenger_msg_insert" ON messenger_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM messenger_conversations mc
      WHERE mc.id = conversation_id
      AND public.user_in_empresa(mc.empresa_id)
    )
  )
);

CREATE POLICY "messenger_msg_update" ON messenger_messages
FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "messenger_msg_delete" ON messenger_messages
FOR DELETE USING (
  sender_id = auth.uid() 
  OR public.is_admin(auth.uid())
);

-- MESSENGER_PRESENCE - Simple policies
CREATE POLICY "messenger_presence_select" ON messenger_presence
FOR SELECT USING (public.user_in_empresa(empresa_id));

CREATE POLICY "messenger_presence_all" ON messenger_presence
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- MESSENGER_EXTERNAL_CONTACTS - Simple policies
CREATE POLICY "messenger_ext_select" ON messenger_external_contacts
FOR SELECT USING (public.user_in_empresa(empresa_id));

CREATE POLICY "messenger_ext_insert" ON messenger_external_contacts
FOR INSERT WITH CHECK (public.user_in_empresa(empresa_id));

CREATE POLICY "messenger_ext_update" ON messenger_external_contacts
FOR UPDATE USING (public.user_in_empresa(empresa_id));

CREATE POLICY "messenger_ext_delete" ON messenger_external_contacts
FOR DELETE USING (public.user_in_empresa(empresa_id));