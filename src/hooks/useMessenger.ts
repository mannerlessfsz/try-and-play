import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export type ConversationType = "direct" | "group" | "channel";
export type PresenceStatus = "online" | "away" | "busy" | "in_meeting" | "offline";

export interface Conversation {
  id: string;
  empresa_id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  departamento: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  participants?: Participant[];
  last_message?: Message | null;
  unread_count?: number;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  is_muted: boolean;
  last_read_at: string | null;
  joined_at: string;
  // Joined data
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  presence?: UserPresence;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  reply_to_id: string | null;
  mentions: string[] | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  sender?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  reply_to?: Message | null;
}

export interface UserPresence {
  user_id: string;
  empresa_id: string;
  status: PresenceStatus;
  status_message: string | null;
  last_seen_at: string;
  updated_at: string;
}

export interface ExternalContact {
  id: string;
  empresa_id: string;
  conversation_id: string | null;
  phone: string;
  name: string;
  avatar_url: string | null;
  tag: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  whatsapp_id: string | null;
  is_active: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMessenger() {
  const { user } = useAuth();
  const { empresaAtiva } = useEmpresaAtiva();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ["messenger-conversations", empresaAtiva?.id],
    queryFn: async () => {
      if (!empresaAtiva?.id) return [];
      
      const { data, error } = await supabase
        .from("messenger_conversations")
        .select(`
          *,
          messenger_participants!inner (
            id,
            user_id,
            role,
            is_muted,
            last_read_at
          )
        `)
        .eq("empresa_id", empresaAtiva.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!empresaAtiva?.id && !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messenger-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messenger_messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      
      // Fetch sender profiles separately
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return messagesData.map(m => ({
        ...m,
        sender: profileMap.get(m.sender_id) || null,
      })) as Message[];
    },
    enabled: !!selectedConversation?.id,
  });

  // Fetch team members (internal users)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["messenger-team", empresaAtiva?.id],
    queryFn: async () => {
      if (!empresaAtiva?.id) return [];
      
      // Fetch user_empresas
      const { data: userEmpresas, error: ueError } = await supabase
        .from("user_empresas")
        .select("user_id, is_owner")
        .eq("empresa_id", empresaAtiva.id);

      if (ueError) throw ueError;
      
      // Fetch profiles separately
      const userIds = userEmpresas.map(ue => ue.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return userEmpresas.map(ue => ({
        ...ue,
        profiles: profileMap.get(ue.user_id) || null,
      }));
    },
    enabled: !!empresaAtiva?.id,
  });

  // Fetch external contacts
  const { data: externalContacts = [] } = useQuery({
    queryKey: ["messenger-external", empresaAtiva?.id],
    queryFn: async () => {
      if (!empresaAtiva?.id) return [];
      
      const { data, error } = await supabase
        .from("messenger_external_contacts")
        .select("*")
        .eq("empresa_id", empresaAtiva.id)
        .eq("is_active", true)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as ExternalContact[];
    },
    enabled: !!empresaAtiva?.id,
  });

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async (data: {
      type: ConversationType;
      name?: string;
      description?: string;
      departamento?: string;
      is_private?: boolean;
      participant_ids: string[];
    }) => {
      if (!empresaAtiva?.id || !user?.id) throw new Error("Empresa ou usuário não encontrado");

      // Create conversation - cast departamento properly
      const insertData: {
        empresa_id: string;
        type: ConversationType;
        name: string | null;
        description: string | null;
        departamento?: "contabil" | "departamento_pessoal" | "fiscal";
        is_private: boolean;
        created_by: string;
      } = {
        empresa_id: empresaAtiva.id,
        type: data.type,
        name: data.name || null,
        description: data.description || null,
        is_private: data.is_private || false,
        created_by: user.id,
      };
      
      // Only add departamento if it's a valid enum value
      if (data.departamento && ["contabil", "departamento_pessoal", "fiscal"].includes(data.departamento)) {
        insertData.departamento = data.departamento as "contabil" | "departamento_pessoal" | "fiscal";
      }
      
      const { data: conversation, error: convError } = await supabase
        .from("messenger_conversations")
        .insert(insertData)
        .select()
        .single();

      if (convError) throw convError;

      // Add creator as admin
      const participants = [
        { conversation_id: conversation.id, user_id: user.id, role: "admin" },
        ...data.participant_ids
          .filter(id => id !== user.id)
          .map(id => ({ conversation_id: conversation.id, user_id: id, role: "member" })),
      ];

      const { error: partError } = await supabase
        .from("messenger_participants")
        .insert(participants);

      if (partError) throw partError;

      return conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messenger-conversations"] });
      setSelectedConversation(data);
      toast.success("Conversa criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar conversa: " + error.message);
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: {
      conversation_id: string;
      content: string;
      message_type?: string;
      reply_to_id?: string;
      mentions?: string[];
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data: message, error } = await supabase
        .from("messenger_messages")
        .insert({
          conversation_id: data.conversation_id,
          sender_id: user.id,
          content: data.content,
          message_type: data.message_type || "text",
          reply_to_id: data.reply_to_id || null,
          mentions: data.mentions || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from("messenger_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.conversation_id);

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messenger-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["messenger-conversations"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao enviar mensagem: " + error.message);
    },
  });

  // Update presence mutation
  const updatePresence = useMutation({
    mutationFn: async (status: PresenceStatus, statusMessage?: string) => {
      if (!user?.id || !empresaAtiva?.id) throw new Error("Usuário ou empresa não encontrado");

      const { error } = await supabase
        .from("messenger_presence")
        .upsert({
          user_id: user.id,
          empresa_id: empresaAtiva.id,
          status,
          status_message: statusMessage || null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
  });

  // Create external contact mutation
  const createExternalContact = useMutation({
    mutationFn: async (data: {
      phone: string;
      name: string;
      tag?: string;
      cliente_id?: string;
      fornecedor_id?: string;
    }) => {
      if (!empresaAtiva?.id) throw new Error("Empresa não encontrada");

      const { data: contact, error } = await supabase
        .from("messenger_external_contacts")
        .insert({
          empresa_id: empresaAtiva.id,
          phone: data.phone,
          name: data.name,
          tag: data.tag || null,
          cliente_id: data.cliente_id || null,
          fornecedor_id: data.fornecedor_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messenger-external"] });
      toast.success("Contato externo adicionado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar contato: " + error.message);
    },
  });

  // Realtime subscription for messages
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messenger_messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["messenger-messages", selectedConversation.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, queryClient]);

  // Set initial presence
  useEffect(() => {
    if (user?.id && empresaAtiva?.id) {
      updatePresence.mutate("online" as PresenceStatus);

      // Update to offline on unmount
      return () => {
        updatePresence.mutate("offline" as PresenceStatus);
      };
    }
  }, [user?.id, empresaAtiva?.id]);

  // Group conversations by type
  const groupedConversations = useMemo(() => {
    const groups = {
      direct: [] as Conversation[],
      group: [] as Conversation[],
      channel: [] as Conversation[],
    };

    conversations.forEach((conv) => {
      if (conv.type in groups) {
        groups[conv.type as keyof typeof groups].push(conv);
      }
    });

    return groups;
  }, [conversations]);

  return {
    // State
    selectedConversation,
    setSelectedConversation,
    
    // Data
    conversations,
    groupedConversations,
    messages,
    teamMembers,
    externalContacts,
    
    // Loading
    isLoadingConversations,
    isLoadingMessages,
    
    // Mutations
    createConversation,
    sendMessage,
    updatePresence,
    createExternalContact,
  };
}
