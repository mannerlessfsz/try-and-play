-- Drop problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON messenger_participants;
DROP POLICY IF EXISTS "Admins can add participants" ON messenger_participants;
DROP POLICY IF EXISTS "Admins can remove participants" ON messenger_participants;

-- Create simpler, non-recursive policies for messenger_participants
CREATE POLICY "Users can view participants" ON messenger_participants
FOR SELECT USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND mc.empresa_id IN (
      SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Authenticated users can add participants" ON messenger_participants
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND mc.empresa_id IN (
      SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage participants" ON messenger_participants
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND mc.created_by = auth.uid()
  )
);

-- Also fix any issues with messenger_conversations policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON messenger_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON messenger_conversations;
DROP POLICY IF EXISTS "Creators can update conversations" ON messenger_conversations;

CREATE POLICY "Users can view company conversations" ON messenger_conversations
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create company conversations" ON messenger_conversations
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Creators can update their conversations" ON messenger_conversations
FOR UPDATE USING (created_by = auth.uid());

-- Fix messenger_messages policies
DROP POLICY IF EXISTS "Participants can view messages" ON messenger_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messenger_messages;

CREATE POLICY "Users can view messages in company conversations" ON messenger_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND mc.empresa_id IN (
      SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can send messages in company conversations" ON messenger_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messenger_conversations mc
    WHERE mc.id = conversation_id
    AND mc.empresa_id IN (
      SELECT empresa_id FROM user_empresas WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update own messages" ON messenger_messages
FOR UPDATE USING (sender_id = auth.uid());