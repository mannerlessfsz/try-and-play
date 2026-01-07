import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Paperclip, Mic, 
  Check, CheckCheck, Clock, 
  Sparkles, Zap, Radio, Users, Hash, MessageCircle,
  ArrowLeft, X, Search, Plus, UserPlus, Settings,
  Phone, Building2, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMessenger, type Conversation, type Message, type ConversationType } from "@/hooks/useMessenger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Gradients por tipo
const typeGradients = {
  direct: { from: "#3b82f6", to: "#06b6d4", glow: "rgba(59, 130, 246, 0.5)" },
  group: { from: "#a855f7", to: "#ec4899", glow: "rgba(168, 85, 247, 0.5)" },
  channel: { from: "#f97316", to: "#eab308", glow: "rgba(249, 115, 22, 0.5)" },
  external: { from: "#10b981", to: "#14b8a6", glow: "rgba(16, 185, 129, 0.5)" },
};

// Componente de Partículas
const CosmicParticles = () => {
  const particles = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-orange-400/20"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

// Fundo Nebulosa
const NebulaBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-orange-950/10" />
    <motion.div 
      className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full"
      style={{ background: "radial-gradient(circle, rgba(249, 115, 22, 0.06) 0%, transparent 70%)", filter: "blur(60px)" }}
      animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
      transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
    />
    <motion.div 
      className="absolute bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full"
      style={{ background: "radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%)", filter: "blur(50px)" }}
      animate={{ scale: [1.1, 1, 1.1] }}
      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
    />
    <CosmicParticles />
  </div>
);

// Orbe de Conversa
const ConversationOrb = ({ 
  conversation, 
  isSelected, 
  onClick,
  type = "direct"
}: { 
  conversation: Conversation | { id: string; name: string; type: ConversationType };
  isSelected: boolean;
  onClick: () => void;
  type?: ConversationType;
}) => {
  const gradient = typeGradients[type] || typeGradients.direct;
  const initials = (conversation.name || "?").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative cursor-pointer group flex flex-col items-center gap-2"
    >
      {/* Anel de energia */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-60"
        style={{ background: `conic-gradient(from 0deg, ${gradient.from}, ${gradient.to}, ${gradient.from})`, padding: 2 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full rounded-full bg-background" />
      </motion.div>
      
      {/* Glow */}
      {isSelected && (
        <motion.div
          className="absolute inset-[-6px] rounded-full"
          style={{ background: `radial-gradient(circle, ${gradient.glow} 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Avatar */}
      <div 
        className={cn(
          "relative w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm",
          isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background"
        )}
        style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
      >
        {type === "channel" ? <Hash className="w-6 h-6" /> : 
         type === "group" ? <Users className="w-5 h-5" /> : 
         initials}
      </div>
      
      {/* Nome */}
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center max-w-[80px] truncate">
        {conversation.name || "Chat"}
      </span>
    </motion.div>
  );
};

// Seção de Orbes
const OrbSection = ({ 
  title, 
  icon: Icon, 
  items, 
  type,
  selectedId,
  onSelect,
  gradient
}: { 
  title: string;
  icon: React.ElementType;
  items: any[];
  type: ConversationType;
  selectedId?: string;
  onSelect: (item: any) => void;
  gradient: { from: string; to: string };
}) => {
  if (items.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <span 
          className="text-xs font-medium px-3 py-1 rounded-full border flex items-center gap-1.5"
          style={{ 
            background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
            borderColor: `${gradient.from}30`,
            color: gradient.from 
          }}
        >
          <Icon className="w-3 h-3" />
          {title}
        </span>
      </div>
      
      <div className="flex flex-wrap justify-center gap-6">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <ConversationOrb
              conversation={item}
              type={type}
              isSelected={selectedId === item.id}
              onClick={() => onSelect(item)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Mensagem com estilo energia
const EnergyMessage = ({ message, isFromMe }: { message: Message; isFromMe: boolean }) => {
  const time = new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isFromMe ? 30 : -30, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={cn("flex", isFromMe ? "justify-end" : "justify-start")}
    >
      <div className="relative group max-w-[70%]">
        <div
          className={cn(
            "absolute inset-0 rounded-2xl blur-md opacity-20",
            isFromMe ? "bg-orange-500" : "bg-purple-500"
          )}
        />
        
        <div
          className={cn(
            "relative px-4 py-2.5 rounded-2xl backdrop-blur-sm border",
            isFromMe 
              ? "bg-gradient-to-r from-orange-500/90 to-orange-600/90 border-orange-400/30 text-white rounded-br-sm" 
              : "bg-card/70 border-purple-500/20 text-foreground rounded-bl-sm"
          )}
        >
          {message.sender && !isFromMe && (
            <p className="text-xs font-medium text-purple-400 mb-1">
              {message.sender.full_name || message.sender.email}
            </p>
          )}
          
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          
          <div className={cn(
            "flex items-center justify-end gap-1.5 mt-1",
            isFromMe ? "text-orange-100/80" : "text-muted-foreground"
          )}>
            <span className="text-[10px]">{time}</span>
            {isFromMe && <CheckCheck className="w-3 h-3" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Input Holográfico
const HolographicInput = ({ 
  value, 
  onChange, 
  onSend,
  disabled
}: { 
  value: string; 
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-orange-500/20 blur-lg opacity-50" />
      
      <div className="relative flex items-center gap-3 p-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-orange-500/20">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-orange-400">
          <Paperclip className="w-4 h-4" />
        </Button>
        
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={disabled}
          className="flex-1 bg-transparent border-0 focus-visible:ring-0"
        />
        
        <AnimatePresence mode="wait">
          {value.trim() ? (
            <motion.div key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Button
                onClick={onSend}
                size="icon"
                disabled={disabled}
                className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-orange-400">
                <Mic className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Modal de Nova Conversa
const NewConversationModal = ({ 
  teamMembers,
  onCreateDirect,
  onCreateGroup,
  onCreateChannel,
}: {
  teamMembers: any[];
  onCreateDirect: (userId: string) => void;
  onCreateGroup: (name: string, userIds: string[]) => void;
  onCreateChannel: (name: string, departamento?: string) => void;
}) => {
  const [groupName, setGroupName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-orange-500/20">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nova Conversa</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="direct" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-background/50">
            <TabsTrigger value="direct" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <MessageCircle className="w-4 h-4 mr-2" /> Direto
            </TabsTrigger>
            <TabsTrigger value="group" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <Users className="w-4 h-4 mr-2" /> Grupo
            </TabsTrigger>
            <TabsTrigger value="channel" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              <Hash className="w-4 h-4 mr-2" /> Canal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Selecione um membro da equipe:</p>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <Button
                    key={member.user_id}
                    variant="ghost"
                    className="w-full justify-start hover:bg-blue-500/10"
                    onClick={() => onCreateDirect(member.user_id)}
                  >
                    <Avatar className="w-8 h-8 mr-3">
                      <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                        {(member.profiles?.full_name || member.profiles?.email || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.profiles?.full_name || member.profiles?.email}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="group" className="space-y-4 mt-4">
            <div>
              <Label>Nome do Grupo</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Equipe Fiscal"
                className="mt-1 bg-background/50 border-purple-500/20"
              />
            </div>
            <div>
              <Label>Membros</Label>
              <ScrollArea className="h-[150px] mt-2 border rounded-lg border-purple-500/20 p-2">
                {teamMembers.map((member) => (
                  <label key={member.user_id} className="flex items-center gap-2 p-2 hover:bg-purple-500/10 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(member.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, member.user_id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== member.user_id));
                        }
                      }}
                      className="rounded border-purple-500/30"
                    />
                    <span className="text-sm">{member.profiles?.full_name || member.profiles?.email}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
            <Button
              onClick={() => onCreateGroup(groupName, selectedUsers)}
              disabled={!groupName.trim() || selectedUsers.length === 0}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Criar Grupo
            </Button>
          </TabsContent>
          
          <TabsContent value="channel" className="space-y-4 mt-4">
            <div>
              <Label>Nome do Canal</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Ex: anuncios-gerais"
                className="mt-1 bg-background/50 border-orange-500/20"
              />
            </div>
            <Button
              onClick={() => onCreateChannel(channelName)}
              disabled={!channelName.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500"
            >
              Criar Canal
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Chat Expandido
const ExpandedChat = ({ 
  conversation, 
  messages, 
  onClose,
  onSendMessage,
  isSending,
  currentUserId,
}: {
  conversation: Conversation;
  messages: Message[];
  onClose: () => void;
  onSendMessage: (content: string) => void;
  isSending: boolean;
  currentUserId?: string;
}) => {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const gradient = typeGradients[conversation.type] || typeGradients.direct;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage("");
  }, [newMessage, onSendMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 30 }}
      className="absolute inset-4 md:inset-8 z-50 flex flex-col rounded-3xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl" />
      <div 
        className="absolute inset-0 rounded-3xl opacity-50"
        style={{ background: `linear-gradient(135deg, ${gradient.from}10, ${gradient.to}10)` }}
      />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
          >
            {conversation.type === "channel" ? <Hash className="w-5 h-5" /> : 
             conversation.type === "group" ? <Users className="w-4 h-4" /> :
             (conversation.name || "?").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{conversation.name || "Chat"}</h2>
            <p className="text-xs text-muted-foreground">
              {conversation.type === "channel" ? "Canal" : 
               conversation.type === "group" ? "Grupo" : "Conversa direta"}
            </p>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-foreground/10">
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Mensagens */}
      <ScrollArea className="relative z-10 flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Inicie a conversa!</p>
            </div>
          ) : (
            messages.map((message) => (
              <EnergyMessage 
                key={message.id} 
                message={message} 
                isFromMe={message.sender_id === currentUserId}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input */}
      <div className="relative z-10 p-4">
        <HolographicInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSend}
          disabled={isSending}
        />
      </div>
    </motion.div>
  );
};

export default function Messenger() {
  const { user } = useAuth();
  const { empresaAtiva } = useEmpresaAtiva();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");
  
  const {
    selectedConversation,
    setSelectedConversation,
    groupedConversations,
    messages,
    teamMembers,
    externalContacts,
    isLoadingConversations,
    isLoadingMessages,
    createConversation,
    sendMessage,
  } = useMessenger();

  const handleCreateDirect = useCallback((userId: string) => {
    const member = teamMembers.find(m => m.user_id === userId);
    createConversation.mutate({
      type: "direct",
      name: member?.profiles?.full_name || member?.profiles?.email || "Chat",
      participant_ids: [userId],
    });
  }, [teamMembers, createConversation]);

  const handleCreateGroup = useCallback((name: string, userIds: string[]) => {
    createConversation.mutate({
      type: "group",
      name,
      participant_ids: userIds,
    });
  }, [createConversation]);

  const handleCreateChannel = useCallback((name: string, departamento?: string) => {
    createConversation.mutate({
      type: "channel",
      name,
      departamento,
      participant_ids: [],
    });
  }, [createConversation]);

  const handleSendMessage = useCallback((content: string) => {
    if (!selectedConversation) return;
    sendMessage.mutate({
      conversation_id: selectedConversation.id,
      content,
    });
  }, [selectedConversation, sendMessage]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      <NebulaBackground />
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between p-4 md:p-6"
      >
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-6 h-6 text-orange-400" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Nebula Messenger
            </h1>
            <p className="text-sm text-muted-foreground">{empresaAtiva?.nome || "VAULT"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-card/40 backdrop-blur border border-foreground/10">
            <button
              onClick={() => setActiveTab("internal")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "internal" 
                  ? "bg-orange-500 text-white" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-3 h-3 inline mr-1" /> Interno
            </button>
            <button
              onClick={() => setActiveTab("external")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "external" 
                  ? "bg-green-500 text-white" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Phone className="w-3 h-3 inline mr-1" /> Externo
            </button>
          </div>
          
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 180, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="bg-card/60 border-orange-500/20 h-9"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="rounded-full hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400"
          >
            <Search className="w-5 h-5" />
          </Button>
          
          <NewConversationModal
            teamMembers={teamMembers}
            onCreateDirect={handleCreateDirect}
            onCreateGroup={handleCreateGroup}
            onCreateChannel={handleCreateChannel}
          />
        </div>
      </motion.div>
      
      {/* Área Principal */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : activeTab === "internal" ? (
          <>
            {/* Canais */}
            <OrbSection
              title="Canais"
              icon={Hash}
              items={groupedConversations.channel}
              type="channel"
              selectedId={selectedConversation?.id}
              onSelect={setSelectedConversation}
              gradient={typeGradients.channel}
            />
            
            {/* Grupos */}
            <OrbSection
              title="Grupos"
              icon={Users}
              items={groupedConversations.group}
              type="group"
              selectedId={selectedConversation?.id}
              onSelect={setSelectedConversation}
              gradient={typeGradients.group}
            />
            
            {/* Conversas Diretas */}
            <OrbSection
              title="Conversas Diretas"
              icon={MessageCircle}
              items={groupedConversations.direct}
              type="direct"
              selectedId={selectedConversation?.id}
              onSelect={setSelectedConversation}
              gradient={typeGradients.direct}
            />
            
            {/* Mensagem vazia */}
            {groupedConversations.channel.length === 0 && 
             groupedConversations.group.length === 0 && 
             groupedConversations.direct.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-orange-500/30" />
                <p className="text-muted-foreground mb-2">Nenhuma conversa ainda</p>
                <p className="text-sm text-muted-foreground/60">Clique no + para iniciar</p>
              </motion.div>
            )}
          </>
        ) : (
          /* Contatos Externos */
          <div className="w-full max-w-3xl">
            <OrbSection
              title="Clientes"
              icon={Building2}
              items={externalContacts.filter(c => c.tag === "cliente").map(c => ({ ...c, type: "direct" as ConversationType }))}
              type="direct"
              selectedId={selectedConversation?.id}
              onSelect={(c) => c.conversation_id && setSelectedConversation({ id: c.conversation_id, name: c.name } as Conversation)}
              gradient={typeGradients.external}
            />
            
            <OrbSection
              title="Fornecedores"
              icon={Briefcase}
              items={externalContacts.filter(c => c.tag === "fornecedor").map(c => ({ ...c, type: "direct" as ConversationType }))}
              type="direct"
              selectedId={selectedConversation?.id}
              onSelect={(c) => c.conversation_id && setSelectedConversation({ id: c.conversation_id, name: c.name } as Conversation)}
              gradient={{ from: "#a855f7", to: "#ec4899" }}
            />
            
            {externalContacts.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <Phone className="w-16 h-16 mx-auto mb-4 text-green-500/30" />
                <p className="text-muted-foreground mb-2">Nenhum contato externo</p>
                <p className="text-sm text-muted-foreground/60">Aguardando integração WhatsApp Business</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
      
      {/* Status API */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 p-4 flex justify-center"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/40 backdrop-blur-xl border border-orange-500/20">
          <motion.div
            className="w-2 h-2 rounded-full bg-orange-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs text-orange-400">Sistema de mensagens ativo</span>
        </div>
      </motion.div>
      
      {/* Chat Expandido */}
      <AnimatePresence>
        {selectedConversation && (
          <ExpandedChat
            conversation={selectedConversation}
            messages={messages}
            onClose={() => setSelectedConversation(null)}
            onSendMessage={handleSendMessage}
            isSending={sendMessage.isPending}
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
