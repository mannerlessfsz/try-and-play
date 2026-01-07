import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { 
  MessageCircle, Search, Phone, Video, MoreVertical, 
  Send, Paperclip, Smile, Mic, Image, FileText, 
  Check, CheckCheck, Clock, Users, Settings,
  ChevronDown, Star, Archive, Bell, BellOff,
  ArrowLeft, Plus, Camera, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

// Dados mock para demonstração
const mockContacts: Contact[] = [
  { id: "1", name: "João Silva", phone: "+55 11 99999-1111", lastMessage: "Ok, vou enviar os documentos", lastMessageTime: "10:30", unreadCount: 2, isOnline: true, isPinned: true },
  { id: "2", name: "Maria Santos", phone: "+55 11 99999-2222", lastMessage: "Obrigada pela informação!", lastMessageTime: "09:45", isOnline: true },
  { id: "3", name: "Carlos Oliveira", phone: "+55 11 99999-3333", lastMessage: "Quando posso passar aí?", lastMessageTime: "Ontem", unreadCount: 1 },
  { id: "4", name: "Ana Costa", phone: "+55 11 99999-4444", lastMessage: "Documento recebido ✓", lastMessageTime: "Ontem" },
  { id: "5", name: "Pedro Lima", phone: "+55 11 99999-5555", lastMessage: "Perfeito!", lastMessageTime: "Seg", isMuted: true },
  { id: "6", name: "Fernanda Souza", phone: "+55 11 99999-6666", lastMessage: "Vou verificar e te retorno", lastMessageTime: "12/01" },
];

const mockMessages: Message[] = [
  { id: "1", contactId: "1", content: "Olá! Tudo bem?", timestamp: "10:00", isFromMe: false, status: "read", type: "text" },
  { id: "2", contactId: "1", content: "Oi João! Tudo sim, e você?", timestamp: "10:02", isFromMe: true, status: "read", type: "text" },
  { id: "3", contactId: "1", content: "Preciso enviar alguns documentos para vocês", timestamp: "10:15", isFromMe: false, status: "read", type: "text" },
  { id: "4", contactId: "1", content: "Claro! Pode enviar por aqui mesmo", timestamp: "10:18", isFromMe: true, status: "read", type: "text" },
  { id: "5", contactId: "1", content: "Ok, vou enviar os documentos", timestamp: "10:30", isFromMe: false, status: "read", type: "text" },
];

export default function Messenger() {
  const { user } = useAuth();
  const { empresaAtiva } = useEmpresaAtiva();
  
  const [contacts] = useState<Contact[]>(mockContacts);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedContact]);

  // Filtra contatos pela busca
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  // Ordena: fixados primeiro, depois por horário
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  // Mensagens do contato selecionado
  const contactMessages = selectedContact 
    ? messages.filter(m => m.contactId === selectedContact.id)
    : [];

  // Envia mensagem
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

    // Simula mudança de status
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

  // Seleciona contato
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowMobileChat(true);
  };

  // Ícone de status da mensagem
  const MessageStatus = ({ status }: { status: Message["status"] }) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
      case "sent":
        return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  // Componente Lista de Contatos
  const ContactList = () => (
    <div className={cn(
      "flex flex-col h-full bg-card border-r border-border",
      "w-full md:w-[380px] lg:w-[420px]",
      showMobileChat && "hidden md:flex"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-emerald-500/20 text-emerald-500">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold text-foreground">Messenger</h1>
              <p className="text-xs text-muted-foreground">{empresaAtiva?.nome || "Empresa"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Users className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar ou começar nova conversa"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
          />
        </div>
      </div>

      {/* Lista de Contatos */}
      <ScrollArea className="flex-1">
        {sortedContacts.map(contact => (
          <div
            key={contact.id}
            onClick={() => handleSelectContact(contact)}
            className={cn(
              "flex items-center gap-3 p-3 cursor-pointer transition-colors",
              "hover:bg-muted/50",
              selectedContact?.id === contact.id && "bg-muted"
            )}
          >
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={contact.avatar} />
                <AvatarFallback className="bg-emerald-500/20 text-emerald-500">
                  {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {contact.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground truncate flex items-center gap-1">
                  {contact.name}
                  {contact.isPinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                </span>
                <span className={cn(
                  "text-xs",
                  contact.unreadCount ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {contact.lastMessageTime}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm text-muted-foreground truncate pr-2 flex items-center gap-1">
                  {contact.isMuted && <BellOff className="w-3 h-3" />}
                  {contact.isTyping ? (
                    <span className="text-emerald-500 italic">digitando...</span>
                  ) : (
                    contact.lastMessage
                  )}
                </p>
                {contact.unreadCount ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                    {contact.unreadCount}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {filteredContacts.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum contato encontrado</p>
          </div>
        )}
      </ScrollArea>

      {/* Status da API */}
      <div className="p-3 border-t border-border bg-yellow-500/10">
        <div className="flex items-center gap-2 text-xs text-yellow-600">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span>Aguardando conexão com WhatsApp Business API</span>
        </div>
      </div>
    </div>
  );

  // Componente Área de Chat
  const ChatArea = () => (
    <div className={cn(
      "flex-1 flex flex-col h-full bg-background",
      !showMobileChat && "hidden md:flex"
    )}>
      {selectedContact ? (
        <>
          {/* Header do Chat */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-card/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-muted-foreground"
                onClick={() => setShowMobileChat(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedContact.avatar} />
                <AvatarFallback className="bg-emerald-500/20 text-emerald-500">
                  {selectedContact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-foreground">{selectedContact.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedContact.isOnline ? (
                    <span className="text-emerald-500">online</span>
                  ) : (
                    selectedContact.phone
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Video className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Área de Mensagens */}
          <ScrollArea className="flex-1 p-4" style={{ 
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            backgroundColor: 'hsl(var(--muted) / 0.3)'
          }}>
            <div className="space-y-2 max-w-3xl mx-auto">
              {contactMessages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.isFromMe ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
                      message.isFromMe 
                        ? "bg-emerald-500 text-white rounded-br-none" 
                        : "bg-card text-foreground rounded-bl-none"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <div className={cn(
                      "flex items-center justify-end gap-1 mt-1",
                      message.isFromMe ? "text-emerald-100" : "text-muted-foreground"
                    )}>
                      <span className="text-[10px]">{message.timestamp}</span>
                      {message.isFromMe && <MessageStatus status={message.status} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input de Mensagem */}
          <div className="p-3 border-t border-border bg-card/80 backdrop-blur-xl">
            <div className="flex items-center gap-2 max-w-3xl mx-auto">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
                <Smile className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input
                ref={inputRef}
                placeholder="Digite uma mensagem"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
              {newMessage.trim() ? (
                <Button 
                  size="icon" 
                  className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                  onClick={handleSendMessage}
                >
                  <Send className="w-5 h-5" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
                  <Mic className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Estado Vazio */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-64 h-64 mb-6 rounded-full bg-muted/30 flex items-center justify-center">
            <MessageCircle className="w-32 h-32 text-muted-foreground/30" />
          </div>
          <h2 className="text-2xl font-light text-foreground mb-2">Messenger VAULT</h2>
          <p className="text-muted-foreground max-w-md">
            Envie e receba mensagens, documentos e arquivos diretamente pelo sistema.
            Conecte-se com seus clientes de forma rápida e segura.
          </p>
          <div className="mt-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 max-w-md">
            <p className="text-sm text-yellow-600 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configure a integração com WhatsApp Business API para começar
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <ContactList />
      <ChatArea />
    </div>
  );
}
