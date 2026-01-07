import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { 
  Send, Paperclip, Mic, 
  CheckCheck, Sparkles, X, 
  GripVertical, MessageCircle, Users, Hash, Plus, Minimize2, Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMessenger, type Conversation, type Message, type ConversationType } from "@/hooks/useMessenger";
import { useAuth } from "@/contexts/AuthContext";

// Gradients por tipo
const typeGradients = {
  direct: { from: "#3b82f6", to: "#06b6d4", glow: "rgba(59, 130, 246, 0.5)" },
  group: { from: "#a855f7", to: "#ec4899", glow: "rgba(168, 85, 247, 0.5)" },
  channel: { from: "#f97316", to: "#eab308", glow: "rgba(249, 115, 22, 0.5)" },
  external: { from: "#10b981", to: "#14b8a6", glow: "rgba(16, 185, 129, 0.5)" },
};

// Mini Orbe de notificação
const NotificationOrb = ({ 
  conversation,
  onClick,
  unreadCount = 0,
}: { 
  conversation: Conversation;
  onClick: () => void;
  unreadCount?: number;
}) => {
  const gradient = typeGradients[conversation.type] || typeGradients.direct;
  const initials = (conversation.name || "?").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <motion.div
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="relative cursor-pointer group"
      title={conversation.name || "Chat"}
    >
      {/* Anel de energia */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(from 0deg, ${gradient.from}, ${gradient.to}, ${gradient.from})`, padding: 2 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full rounded-full bg-background" />
      </motion.div>
      
      {/* Avatar */}
      <div 
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
        style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
      >
        {conversation.type === "channel" ? <Hash className="w-4 h-4" /> : 
         conversation.type === "group" ? <Users className="w-3.5 h-3.5" /> : 
         initials}
      </div>
      
      {/* Badge de notificação */}
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </motion.span>
      )}
    </motion.div>
  );
};

// Mensagem compacta
const CompactMessage = ({ message, isFromMe }: { message: Message; isFromMe: boolean }) => {
  const time = new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isFromMe ? 15 : -15 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("flex", isFromMe ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] px-3 py-2 rounded-2xl text-sm",
          isFromMe 
            ? "bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white rounded-br-sm" 
            : "bg-card/80 text-foreground rounded-bl-sm border border-muted/30"
        )}
      >
        {message.sender && !isFromMe && (
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
            {message.sender.full_name || message.sender.email}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div className={cn("flex items-center justify-end gap-1 mt-0.5", isFromMe ? "text-orange-100/70" : "text-muted-foreground/70")}>
          <span className="text-[9px]">{time}</span>
          {isFromMe && <CheckCheck className="w-2.5 h-2.5" />}
        </div>
      </div>
    </motion.div>
  );
};

// Chat expandido flutuante
const FloatingChat = ({
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
  const dragControls = useDragControls();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage("");
  }, [newMessage, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.1}
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 50 }}
      className="fixed bottom-24 right-6 z-[60] w-[360px] h-[500px] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
      <div 
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{ background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)` }}
      />
      <div className="absolute inset-0 border border-foreground/10 rounded-2xl" />
      
      {/* Header com drag */}
      <div 
        className="relative z-10 flex items-center gap-3 p-3 border-b border-foreground/10 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/50" />
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
          style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
        >
          {conversation.type === "channel" ? <Hash className="w-4 h-4" /> : 
           conversation.type === "group" ? <Users className="w-3.5 h-3.5" /> :
           (conversation.name || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">{conversation.name || "Chat"}</h3>
          <p className="text-[10px] text-muted-foreground">
            {conversation.type === "channel" ? "Canal" : conversation.type === "group" ? "Grupo" : "Conversa"}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="shrink-0 w-7 h-7 rounded-full hover:bg-foreground/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Mensagens */}
      <ScrollArea className="relative z-10 flex-1 p-3">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Inicie a conversa!</p>
            </div>
          ) : (
            messages.map((message) => (
              <CompactMessage 
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
      <div className="relative z-10 p-3 border-t border-foreground/10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8 text-muted-foreground hover:text-orange-400">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem..."
            disabled={isSending}
            className="flex-1 bg-card/60 border-foreground/10 h-9 text-sm"
          />
          <AnimatePresence mode="wait">
            {newMessage.trim() ? (
              <motion.div key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={isSending}
                  className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600"
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
    </motion.div>
  );
};

// Componente principal
export function FloatingMessenger() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [openChat, setOpenChat] = useState<Conversation | null>(null);
  const dragControls = useDragControls();
  
  const {
    conversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    sendMessage,
    isLoadingConversations,
  } = useMessenger();

  const handleOpenChat = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    setOpenChat(conv);
  }, [setSelectedConversation]);

  const handleCloseChat = useCallback(() => {
    setOpenChat(null);
    setSelectedConversation(null);
  }, [setSelectedConversation]);

  const handleSendMessage = useCallback((content: string) => {
    if (!openChat) return;
    sendMessage.mutate({
      conversation_id: openChat.id,
      content,
    });
  }, [openChat, sendMessage]);

  // Mostrar apenas as primeiras 5 conversas quando colapsado
  const visibleConversations = useMemo(() => {
    return isExpanded ? conversations : conversations.slice(0, 3);
  }, [conversations, isExpanded]);

  if (isLoadingConversations || !user) return null;

  return (
    <>
      {/* Widget principal */}
      <motion.div
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.1}
        initial={{ opacity: 0, scale: 0.9, x: 100 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        className={cn(
          "fixed z-50 right-6 bottom-6",
          "rounded-2xl border backdrop-blur-xl",
          "bg-gradient-to-br from-background/95 to-background/80",
          "border-orange-500/30 shadow-2xl shadow-orange-500/10"
        )}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing border-b border-foreground/5"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/40" />
          <motion.div
            className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center"
          >
            <MessageCircle className="w-3.5 h-3.5 text-orange-400" />
          </motion.div>
          <span className="text-xs font-medium text-foreground/80">Mensagens</span>
          
          <div className="flex items-center gap-1 ml-auto">
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
        </div>
        
        {/* Orbes de conversas */}
        <div className={cn("p-3 flex items-center gap-2", isExpanded && "flex-wrap max-w-[260px]")}>
          {visibleConversations.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs">Sem conversas</span>
            </div>
          ) : (
            <>
              {visibleConversations.map((conv) => (
                <NotificationOrb
                  key={conv.id}
                  conversation={conv}
                  onClick={() => handleOpenChat(conv)}
                  unreadCount={0}
                />
              ))}
              
              {!isExpanded && conversations.length > 3 && (
                <motion.button
                  onClick={() => setIsExpanded(true)}
                  className="w-10 h-10 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="text-xs font-medium">+{conversations.length - 3}</span>
                </motion.button>
              )}
            </>
          )}
          
          {/* Botão de nova conversa */}
          <motion.button
            className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 hover:from-orange-500/30 hover:to-orange-600/30 transition-colors"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            title="Nova conversa"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-green-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[10px] text-muted-foreground/60">Online</span>
        </div>
      </motion.div>
      
      {/* Chat flutuante aberto */}
      <AnimatePresence>
        {openChat && (
          <FloatingChat
            conversation={openChat}
            messages={messages}
            onClose={handleCloseChat}
            onSendMessage={handleSendMessage}
            isSending={sendMessage.isPending}
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>
    </>
  );
}
