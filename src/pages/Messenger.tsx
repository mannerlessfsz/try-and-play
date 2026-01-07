import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Search, Phone, Video, MoreVertical, 
  Send, Paperclip, Smile, Mic, Image, FileText, 
  Check, CheckCheck, Clock, Users, Settings,
  Star, Archive, Bell, BellOff, Plus, X, Zap,
  ArrowLeft, Filter, SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GradientMesh } from "@/components/GradientMesh";

// Tipos
interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  tag?: "cliente" | "fornecedor" | "interno";
}

interface Message {
  id: string;
  contactId: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
  status: "sent" | "delivered" | "read" | "pending";
  type: "text" | "image" | "document" | "audio";
  fileName?: string;
}

// Dados mock
const mockContacts: Contact[] = [
  { id: "1", name: "João Silva", phone: "+55 11 99999-1111", lastMessage: "Ok, vou enviar os documentos", lastMessageTime: "10:30", unreadCount: 2, isOnline: true, isPinned: true, tag: "cliente" },
  { id: "2", name: "Maria Santos", phone: "+55 11 99999-2222", lastMessage: "Obrigada pela informação!", lastMessageTime: "09:45", isOnline: true, tag: "cliente" },
  { id: "3", name: "Carlos Oliveira", phone: "+55 11 99999-3333", lastMessage: "Quando posso passar aí?", lastMessageTime: "Ontem", unreadCount: 1, tag: "fornecedor" },
  { id: "4", name: "Ana Costa", phone: "+55 11 99999-4444", lastMessage: "Documento recebido ✓", lastMessageTime: "Ontem", tag: "cliente" },
  { id: "5", name: "Pedro Lima", phone: "+55 11 99999-5555", lastMessage: "Perfeito!", lastMessageTime: "Seg", isMuted: true, tag: "interno" },
  { id: "6", name: "Fernanda Souza", phone: "+55 11 99999-6666", lastMessage: "Vou verificar e te retorno", lastMessageTime: "12/01", tag: "cliente" },
];

const mockMessages: Message[] = [
  { id: "1", contactId: "1", content: "Olá! Tudo bem?", timestamp: "10:00", isFromMe: false, status: "read", type: "text" },
  { id: "2", contactId: "1", content: "Oi João! Tudo sim, e você?", timestamp: "10:02", isFromMe: true, status: "read", type: "text" },
  { id: "3", contactId: "1", content: "Preciso enviar alguns documentos para vocês", timestamp: "10:15", isFromMe: false, status: "read", type: "text" },
  { id: "4", contactId: "1", content: "Claro! Pode enviar por aqui mesmo", timestamp: "10:18", isFromMe: true, status: "read", type: "text" },
  { id: "5", contactId: "1", content: "Ok, vou enviar os documentos", timestamp: "10:30", isFromMe: false, status: "read", type: "text" },
];

const tagColors = {
  cliente: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fornecedor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  interno: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function Messenger() {
  const { user } = useAuth();
  const { empresaAtiva } = useEmpresaAtiva();
  
  const [contacts] = useState<Contact[]>(mockContacts);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "pinned">("all");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedContact]);

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery);
    
    if (activeFilter === "unread") return matchesSearch && (contact.unreadCount || 0) > 0;
    if (activeFilter === "pinned") return matchesSearch && contact.isPinned;
    return matchesSearch;
  });

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const contactMessages = selectedContact 
    ? messages.filter(m => m.contactId === selectedContact.id)
    : [];

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return;

    const message: Message = {
      id: Date.now().toString(),
      contactId: selectedContact.id,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isFromMe: true,
      status: "sent",
      type: "text"
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
    inputRef.current?.focus();

    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, status: "delivered" } : m
      ));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, status: "read" } : m
      ));
    }, 2000);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowMobileChat(true);
  };

  const MessageStatus = ({ status }: { status: Message["status"] }) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case "sent":
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-orange-400" />;
    }
  };

  // Lista de Contatos
  const ContactList = () => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex flex-col h-full",
        "bg-card/40 backdrop-blur-2xl border-r border-orange-500/10",
        "w-full md:w-[380px] lg:w-[420px]",
        showMobileChat && "hidden md:flex"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-orange-500/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20">
              <MessageCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Messenger</h1>
              <p className="text-xs text-muted-foreground">{empresaAtiva?.nome || "VAULT"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10">
              <Plus className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10">
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 border-orange-500/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/40"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "Todas" },
            { key: "unread", label: "Não lidas" },
            { key: "pinned", label: "Fixadas" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as typeof activeFilter)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeFilter === filter.key
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                  : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background/80"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        <AnimatePresence>
          {sortedContacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelectContact(contact)}
              className={cn(
                "flex items-center gap-3 p-3 cursor-pointer transition-all",
                "hover:bg-orange-500/5 border-b border-foreground/5",
                selectedContact?.id === contact.id && "bg-orange-500/10 border-l-2 border-l-orange-500"
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500/30 to-orange-600/20 text-orange-300 font-semibold">
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {contact.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card shadow-lg shadow-green-500/50" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground truncate flex items-center gap-1.5">
                    {contact.name}
                    {contact.isPinned && <Star className="w-3 h-3 text-orange-400 fill-orange-400" />}
                    {contact.isMuted && <BellOff className="w-3 h-3 text-muted-foreground" />}
                  </span>
                  <span className={cn(
                    "text-xs shrink-0",
                    contact.unreadCount ? "text-orange-400 font-medium" : "text-muted-foreground"
                  )}>
                    {contact.lastMessageTime}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5 gap-2">
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.isTyping ? (
                      <span className="text-orange-400 italic">digitando...</span>
                    ) : (
                      contact.lastMessage
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {contact.tag && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", tagColors[contact.tag])}>
                        {contact.tag}
                      </span>
                    )}
                    {contact.unreadCount ? (
                      <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        {contact.unreadCount}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredContacts.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        )}
      </ScrollArea>

      {/* Status API */}
      <div className="p-3 border-t border-orange-500/10 bg-orange-500/5">
        <div className="flex items-center gap-2 text-xs text-orange-400">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>Aguardando conexão com API Business</span>
        </div>
      </div>
    </motion.div>
  );

  // Área de Chat
  const ChatArea = () => (
    <div className={cn(
      "flex-1 flex flex-col h-full relative",
      !showMobileChat && "hidden md:flex"
    )}>
      {/* Background sutil */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--orange-500) / 0.03) 0%, transparent 50%)`,
          }}
        />
      </div>

      {selectedContact ? (
        <>
          {/* Header do Chat */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex items-center justify-between p-3 border-b border-orange-500/10 bg-card/60 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-muted-foreground hover:text-orange-400"
                onClick={() => setShowMobileChat(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="h-10 w-10 border-2 border-orange-500/20">
                <AvatarImage src={selectedContact.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500/30 to-orange-600/20 text-orange-300">
                  {selectedContact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  {selectedContact.name}
                  {selectedContact.tag && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", tagColors[selectedContact.tag])}>
                      {selectedContact.tag}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedContact.isOnline ? (
                    <span className="text-green-400">online</span>
                  ) : (
                    selectedContact.phone
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10">
                <Video className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* Mensagens */}
          <ScrollArea className="flex-1 p-4 relative z-10">
            <div className="space-y-3 max-w-3xl mx-auto">
              <AnimatePresence>
                {contactMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex",
                      message.isFromMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-lg",
                        message.isFromMe 
                          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-md" 
                          : "bg-card/80 backdrop-blur-xl text-foreground border border-foreground/10 rounded-bl-md"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        message.isFromMe ? "text-orange-100" : "text-muted-foreground"
                      )}>
                        <span className="text-[10px]">{message.timestamp}</span>
                        {message.isFromMe && <MessageStatus status={message.status} />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 p-3 border-t border-orange-500/10 bg-card/60 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 max-w-3xl mx-auto">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 shrink-0">
                <Smile className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 shrink-0">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input
                ref={inputRef}
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 bg-background/50 border-orange-500/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/40"
              />
              {newMessage.trim() ? (
                <Button 
                  size="icon" 
                  className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 shrink-0"
                  onClick={handleSendMessage}
                >
                  <Send className="w-5 h-5" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 shrink-0">
                  <Mic className="w-5 h-5" />
                </Button>
              )}
            </div>
          </motion.div>
        </>
      ) : (
        /* Estado Vazio */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-full blur-3xl" />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 flex items-center justify-center mb-6">
              <MessageCircle className="w-16 h-16 text-orange-400" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Messenger <span className="text-orange-400">VAULT</span>
            </h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Comunicação integrada para envio de documentos, lembretes e atendimento ao cliente.
            </p>
            
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 max-w-md">
              <div className="flex items-center gap-3 text-sm text-orange-400">
                <Zap className="w-5 h-5" />
                <span>Configure a API Business para começar a enviar mensagens</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-background relative">
      <GradientMesh />
      <div className="relative z-10 flex w-full h-full">
        <ContactList />
        <ChatArea />
      </div>
    </div>
  );
}
