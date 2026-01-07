import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Paperclip, Mic, 
  Check, CheckCheck, Clock, 
  Sparkles, Zap, Radio, Users, Hash, MessageCircle,
  ArrowLeft, X, Search, Plus, UserPlus, Settings,
  Phone, Building2, Briefcase, Home, ChevronLeft, LogOut, ChevronDown
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    Array.from({ length: 30 }, (_, i) => ({
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
      className="absolute top-1/4 -left-1/4 w-[400px] h-[400px] rounded-full"
      style={{ background: "radial-gradient(circle, rgba(249, 115, 22, 0.04) 0%, transparent 70%)", filter: "blur(60px)" }}
      animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
      transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
    />
    <motion.div 
      className="absolute bottom-1/4 -right-1/4 w-[300px] h-[300px] rounded-full"
      style={{ background: "radial-gradient(circle, rgba(168, 85, 247, 0.03) 0%, transparent 70%)", filter: "blur(50px)" }}
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
      whileHover={{ scale: 1.08 }}
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
          "relative w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm",
          isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background"
        )}
        style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
      >
        {type === "channel" ? <Hash className="w-5 h-5" /> : 
         type === "group" ? <Users className="w-4 h-4" /> : 
         initials}
      </div>
      
      {/* Nome */}
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center max-w-[70px] truncate">
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
      className="mb-6"
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <span 
          className="text-[10px] font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1"
          style={{ 
            background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
            borderColor: `${gradient.from}30`,
            color: gradient.from 
          }}
        >
          <Icon className="w-2.5 h-2.5" />
          {title}
        </span>
      </div>
      
      <div className="flex flex-wrap justify-center gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.04 }}
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
      initial={{ opacity: 0, x: isFromMe ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={cn("flex", isFromMe ? "justify-end" : "justify-start")}
    >
      <div className="relative group max-w-[70%]">
        <div
          className={cn(
            "absolute inset-0 rounded-2xl blur-md opacity-15",
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
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/15 via-purple-500/15 to-orange-500/15 blur-lg opacity-50" />
      
      <div className="relative flex items-center gap-2 p-2.5 rounded-2xl bg-card/60 backdrop-blur-xl border border-orange-500/20">
        <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8 text-muted-foreground hover:text-orange-400">
          <Paperclip className="w-4 h-4" />
        </Button>
        
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={disabled}
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-sm"
        />
        
        <AnimatePresence mode="wait">
          {value.trim() ? (
            <motion.div key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Button
                onClick={onSend}
                size="icon"
                disabled={disabled}
                className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ) : (
            <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8 text-muted-foreground hover:text-orange-400">
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
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const handleCreateDirect = (userId: string) => {
    onCreateDirect(userId);
    setOpen(false);
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      onCreateGroup(groupName, selectedUsers);
      setGroupName("");
      setSelectedUsers([]);
      setOpen(false);
    }
  };

  const handleCreateChannel = () => {
    if (channelName.trim()) {
      onCreateChannel(channelName);
      setChannelName("");
      setOpen(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
          <Plus className="w-4 h-4 mr-1" /> Nova Conversa
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-orange-500/20">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nova Conversa</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="direct" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-background/50">
            <TabsTrigger value="direct" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 text-xs">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Direto
            </TabsTrigger>
            <TabsTrigger value="group" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 text-xs">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Grupo
            </TabsTrigger>
            <TabsTrigger value="channel" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 text-xs">
              <Hash className="w-3.5 h-3.5 mr-1.5" /> Canal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Selecione um membro:</p>
            <ScrollArea className="h-[180px]">
              <div className="space-y-1.5">
                {teamMembers.map((member) => (
                  <Button
                    key={member.user_id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 hover:bg-blue-500/10"
                    onClick={() => handleCreateDirect(member.user_id)}
                  >
                    <Avatar className="w-7 h-7 mr-2">
                      <AvatarFallback className="bg-blue-500/20 text-blue-400 text-[10px]">
                        {(member.profiles?.full_name || member.profiles?.email || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.profiles?.full_name || member.profiles?.email}</span>
                  </Button>
                ))}
                {teamMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro disponível</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="group" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Nome do Grupo</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Equipe Fiscal"
                className="mt-1 bg-background/50 border-purple-500/20 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Membros</Label>
              <ScrollArea className="h-[120px] mt-1 border rounded-lg border-purple-500/20 p-2">
                {teamMembers.map((member) => (
                  <label key={member.user_id} className="flex items-center gap-2 p-1.5 hover:bg-purple-500/10 rounded cursor-pointer">
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
                      className="rounded border-purple-500/30 w-3.5 h-3.5"
                    />
                    <span className="text-sm">{member.profiles?.full_name || member.profiles?.email}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              size="sm"
            >
              Criar Grupo
            </Button>
          </TabsContent>
          
          <TabsContent value="channel" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Nome do Canal</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Ex: anuncios-gerais"
                className="mt-1 bg-background/50 border-orange-500/20 h-9"
              />
            </div>
            <Button
              onClick={handleCreateChannel}
              disabled={!channelName.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500"
              size="sm"
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
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="absolute inset-4 z-50 flex flex-col rounded-2xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
      <div 
        className="absolute inset-0 rounded-2xl opacity-40"
        style={{ background: `linear-gradient(135deg, ${gradient.from}08, ${gradient.to}08)` }}
      />
      <div className="absolute inset-0 border border-foreground/10 rounded-2xl" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-3 border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
          >
            {conversation.type === "channel" ? <Hash className="w-4 h-4" /> : 
             conversation.type === "group" ? <Users className="w-3.5 h-3.5" /> :
             (conversation.name || "?").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-medium text-sm text-foreground">{conversation.name || "Chat"}</h2>
            <p className="text-[10px] text-muted-foreground">
              {conversation.type === "channel" ? "Canal" : 
               conversation.type === "group" ? "Grupo" : "Conversa direta"}
            </p>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full w-8 h-8 hover:bg-foreground/10">
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Mensagens */}
      <ScrollArea className="relative z-10 flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Inicie a conversa!</p>
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
      <div className="relative z-10 p-3">
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

// Sidebar do Messenger
const MessengerSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        className={cn(
          "fixed right-0 top-0 bottom-0 z-40 flex flex-col",
          "bg-gradient-to-b from-background/80 via-background/60 to-background/80",
          "backdrop-blur-2xl border-l border-white/10",
          "shadow-2xl shadow-black/20"
        )}
        animate={{ width: isExpanded ? 220 : 72 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <motion.div className="flex items-center gap-3" animate={{ justifyContent: isExpanded ? "flex-start" : "center" }}>
            <motion.div 
              className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-5 h-5 text-orange-400" />
            </motion.div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <h2 className="font-bold text-foreground tracking-tight">MESSENGER</h2>
                  <p className="text-[10px] text-muted-foreground tracking-wider">NEBULA</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {/* Home */}
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => navigate("/dashboard")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                  whileHover={{ x: isExpanded ? -4 : 0 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Home className="w-5 h-5" />
                  {isExpanded && <span className="text-sm font-medium">Dashboard</span>}
                </motion.button>
              </TooltipTrigger>
              {!isExpanded && <TooltipContent side="left">Dashboard</TooltipContent>}
            </Tooltip>

            {/* Seções */}
            {isExpanded && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 pb-2 px-3">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">Conversas</span>
              </motion.div>
            )}
            
            {[
              { id: "internal", label: "Interno", icon: Users, color: "from-blue-500/20 to-cyan-500/10" },
              { id: "external", label: "Externo", icon: Phone, color: "from-green-500/20 to-emerald-500/10" },
            ].map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                    whileHover={{ x: isExpanded ? -4 : 0 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon className="w-5 h-5" />
                    {isExpanded && <span className="text-sm font-medium">{item.label}</span>}
                  </motion.button>
                </TooltipTrigger>
                {!isExpanded && <TooltipContent side="left">{item.label}</TooltipContent>}
              </Tooltip>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        {user && (
          <div className="p-3 border-t border-white/5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  {isExpanded && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-medium text-foreground leading-none truncate">{displayName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </>
                  )}
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Collapse toggle */}
        <div className="p-3 border-t border-white/5">
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="w-full justify-center hover:bg-white/5">
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </Button>
        </div>

        {/* Decorative line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-orange-500/40 to-transparent" />
      </motion.aside>
    </TooltipProvider>
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
    <div className="min-h-screen flex bg-background relative">
      <NebulaBackground />
      
      {/* Main Content */}
      <div className="flex-1 mr-[220px] relative">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 px-6 py-4 border-b border-white/5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30"
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles className="w-5 h-5 text-orange-400" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                  Nebula Messenger
                </h1>
                <p className="text-xs text-muted-foreground">{empresaAtiva?.nome || "VAULT"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-card/40 backdrop-blur border border-foreground/10">
                <button
                  onClick={() => setActiveTab("internal")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    activeTab === "internal" ? "bg-orange-500 text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="w-3 h-3 inline mr-1" /> Interno
                </button>
                <button
                  onClick={() => setActiveTab("external")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    activeTab === "external" ? "bg-green-500 text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Phone className="w-3 h-3 inline mr-1" /> Externo
                </button>
              </div>
              
              <AnimatePresence>
                {showSearch && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 160, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden">
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." className="bg-card/60 border-orange-500/20 h-8 text-sm" autoFocus />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)} className="w-8 h-8 rounded-full hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400">
                <Search className="w-4 h-4" />
              </Button>
              
              <NewConversationModal teamMembers={teamMembers} onCreateDirect={handleCreateDirect} onCreateGroup={handleCreateGroup} onCreateChannel={handleCreateChannel} />
            </div>
          </div>
        </motion.header>
        
        {/* Área Principal */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-100px)]">
          {isLoadingConversations ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : activeTab === "internal" ? (
            <div className="w-full max-w-3xl">
              <OrbSection title="Canais" icon={Hash} items={groupedConversations.channel} type="channel" selectedId={selectedConversation?.id} onSelect={setSelectedConversation} gradient={typeGradients.channel} />
              <OrbSection title="Grupos" icon={Users} items={groupedConversations.group} type="group" selectedId={selectedConversation?.id} onSelect={setSelectedConversation} gradient={typeGradients.group} />
              <OrbSection title="Conversas Diretas" icon={MessageCircle} items={groupedConversations.direct} type="direct" selectedId={selectedConversation?.id} onSelect={setSelectedConversation} gradient={typeGradients.direct} />
              
              {groupedConversations.channel.length === 0 && groupedConversations.group.length === 0 && groupedConversations.direct.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                  <Sparkles className="w-14 h-14 mx-auto mb-4 text-orange-500/30" />
                  <p className="text-muted-foreground mb-1">Nenhuma conversa ainda</p>
                  <p className="text-sm text-muted-foreground/60">Clique em "Nova Conversa" para iniciar</p>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-3xl">
              <OrbSection title="Clientes" icon={Building2} items={externalContacts.filter(c => c.tag === "cliente").map(c => ({ ...c, type: "direct" as ConversationType }))} type="direct" selectedId={selectedConversation?.id} onSelect={(c) => c.conversation_id && setSelectedConversation({ id: c.conversation_id, name: c.name } as Conversation)} gradient={typeGradients.external} />
              <OrbSection title="Fornecedores" icon={Briefcase} items={externalContacts.filter(c => c.tag === "fornecedor").map(c => ({ ...c, type: "direct" as ConversationType }))} type="direct" selectedId={selectedConversation?.id} onSelect={(c) => c.conversation_id && setSelectedConversation({ id: c.conversation_id, name: c.name } as Conversation)} gradient={{ from: "#a855f7", to: "#ec4899" }} />
              
              {externalContacts.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                  <Phone className="w-14 h-14 mx-auto mb-4 text-green-500/30" />
                  <p className="text-muted-foreground mb-1">Nenhum contato externo</p>
                  <p className="text-sm text-muted-foreground/60">Aguardando integração WhatsApp Business</p>
                </motion.div>
              )}
            </div>
          )}
        </div>
        
        {/* Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 p-4 flex justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/40 backdrop-blur-xl border border-orange-500/20">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-orange-500" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-[10px] text-orange-400">Sistema de mensagens ativo</span>
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
      
      {/* Sidebar */}
      <MessengerSidebar />
    </div>
  );
}
