import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { 
  Send, Paperclip, Mic, 
  Check, CheckCheck, Clock, 
  Sparkles, Zap, Radio,
  ArrowLeft, X, Search, Plus,
  Palette, Moon, Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Tipos de tema
type MessengerTheme = "colorful" | "dark" | "light";

const THEME_STORAGE_KEY = "messenger-page-theme";

// Configurações visuais por tema
const themeStyles: Record<MessengerTheme, {
  bg: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  input: string;
  inputBorder: string;
  chatBg: string;
  chatBorder: string;
}> = {
  colorful: {
    bg: "bg-background",
    card: "bg-card/60 backdrop-blur-xl",
    border: "border-orange-500/20",
    text: "text-foreground",
    textMuted: "text-muted-foreground",
    input: "bg-card/60 backdrop-blur-xl",
    inputBorder: "border-orange-500/20",
    chatBg: "bg-background/80 backdrop-blur-2xl",
    chatBorder: "border-orange-500/20",
  },
  dark: {
    bg: "bg-black",
    card: "bg-zinc-900/90 backdrop-blur-xl",
    border: "border-zinc-700",
    text: "text-white",
    textMuted: "text-zinc-400",
    input: "bg-zinc-900/90",
    inputBorder: "border-zinc-700",
    chatBg: "bg-zinc-950/95 backdrop-blur-2xl",
    chatBorder: "border-zinc-700",
  },
  light: {
    bg: "bg-white",
    card: "bg-white shadow-lg",
    border: "border-gray-200",
    text: "text-gray-900",
    textMuted: "text-gray-500",
    input: "bg-white",
    inputBorder: "border-gray-200",
    chatBg: "bg-white",
    chatBorder: "border-gray-200",
  },
};

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
  tag?: "cliente" | "fornecedor" | "interno";
  energy?: number;
}

interface Message {
  id: string;
  contactId: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
  status: "sent" | "delivered" | "read" | "pending";
  type: "text" | "image" | "document" | "audio";
}

// Dados mock com energia
const mockContacts: Contact[] = [
  { id: "1", name: "João Silva", phone: "+55 11 99999-1111", lastMessage: "Ok, vou enviar os documentos", lastMessageTime: "10:30", unreadCount: 2, isOnline: true, tag: "cliente", energy: 85 },
  { id: "2", name: "Maria Santos", phone: "+55 11 99999-2222", lastMessage: "Obrigada pela informação!", lastMessageTime: "09:45", isOnline: true, tag: "cliente", energy: 72 },
  { id: "3", name: "Carlos Oliveira", phone: "+55 11 99999-3333", lastMessage: "Quando posso passar aí?", lastMessageTime: "Ontem", unreadCount: 1, tag: "fornecedor", energy: 45 },
  { id: "4", name: "Ana Costa", phone: "+55 11 99999-4444", lastMessage: "Documento recebido ✓", lastMessageTime: "Ontem", tag: "cliente", energy: 30 },
  { id: "5", name: "Pedro Lima", phone: "+55 11 99999-5555", lastMessage: "Perfeito!", lastMessageTime: "Seg", tag: "interno", energy: 60 },
  { id: "6", name: "Fernanda Souza", phone: "+55 11 99999-6666", lastMessage: "Vou verificar e te retorno", lastMessageTime: "12/01", tag: "cliente", energy: 15 },
];

const mockMessages: Message[] = [
  { id: "1", contactId: "1", content: "Olá! Tudo bem?", timestamp: "10:00", isFromMe: false, status: "read", type: "text" },
  { id: "2", contactId: "1", content: "Oi João! Tudo sim, e você?", timestamp: "10:02", isFromMe: true, status: "read", type: "text" },
  { id: "3", contactId: "1", content: "Preciso enviar alguns documentos para vocês", timestamp: "10:15", isFromMe: false, status: "read", type: "text" },
  { id: "4", contactId: "1", content: "Claro! Pode enviar por aqui mesmo", timestamp: "10:18", isFromMe: true, status: "read", type: "text" },
  { id: "5", contactId: "1", content: "Ok, vou enviar os documentos", timestamp: "10:30", isFromMe: false, status: "read", type: "text" },
];

const tagGradients: Record<string, { from: string; to: string; glow: string }> = {
  cliente: { from: "#3b82f6", to: "#06b6d4", glow: "rgba(59, 130, 246, 0.5)" },
  fornecedor: { from: "#a855f7", to: "#ec4899", glow: "rgba(168, 85, 247, 0.5)" },
  interno: { from: "#f97316", to: "#eab308", glow: "rgba(249, 115, 22, 0.5)" },
};

// Componente de Partículas Cósmicas
const CosmicParticles = () => {
  const particles = useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-orange-400/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Componente de Nebulosa de Fundo
const NebulaBackground = ({ theme }: { theme: MessengerTheme }) => {
  if (theme === "light") {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-orange-50/30" />
    );
  }

  if (theme === "dark") {
    return (
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradiente principal */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-orange-950/20" />
      
      {/* Nebulosas */}
      <motion.div 
        className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
        animate={{ 
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
        }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
        animate={{ 
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <CosmicParticles />
    </div>
  );
};

// Componente de Orbe de Contato
const ContactOrb = ({ 
  contact, 
  isSelected, 
  onClick,
  index,
}: { 
  contact: Contact; 
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) => {
  const tagStyle = contact.tag ? tagGradients[contact.tag] : tagGradients.cliente;
  const energyScale = 0.8 + (contact.energy || 50) / 200;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
      onClick={onClick}
      className="relative cursor-pointer group"
    >
      {/* Anel de energia */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${tagStyle.from}, ${tagStyle.to}, ${tagStyle.from})`,
          padding: 2,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full rounded-full bg-background" />
      </motion.div>
      
      {/* Glow pulsante */}
      <motion.div
        className="absolute inset-[-4px] rounded-full opacity-50"
        style={{
          background: `radial-gradient(circle, ${tagStyle.glow} 0%, transparent 70%)`,
        }}
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Avatar central */}
      <div 
        className={cn(
          "relative w-16 h-16 rounded-full overflow-hidden",
          "flex items-center justify-center",
          "bg-gradient-to-br text-white font-bold text-lg",
          "transition-transform duration-300",
          isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background"
        )}
        style={{
          background: `linear-gradient(135deg, ${tagStyle.from}, ${tagStyle.to})`,
          transform: `scale(${energyScale})`,
        }}
      >
        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        
        {/* Indicador online */}
        {contact.isOnline && (
          <motion.div
            className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-400 border-2 border-background"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
      
      {/* Badge de mensagens não lidas */}
      {contact.unreadCount && contact.unreadCount > 0 && (
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
        >
          {contact.unreadCount}
        </motion.div>
      )}
      
      {/* Nome no hover */}
      <motion.div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
        initial={{ opacity: 0, y: -5 }}
        whileHover={{ opacity: 1, y: 0 }}
      >
        <span className="text-xs font-medium text-foreground/80 bg-background/80 backdrop-blur px-2 py-1 rounded-lg">
          {contact.name.split(' ')[0]}
        </span>
      </motion.div>
    </motion.div>
  );
};

// Componente de Mensagem Estilo Pulso
const EnergyMessage = ({ message, index }: { message: Message; index: number }) => {
  const isFromMe = message.isFromMe;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isFromMe ? 50 : -50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
      className={cn("flex", isFromMe ? "justify-end" : "justify-start")}
    >
      <div className="relative group">
        {/* Glow de fundo */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl blur-lg opacity-30",
            isFromMe ? "bg-orange-500" : "bg-purple-500"
          )}
        />
        
        {/* Container da mensagem */}
        <div
          className={cn(
            "relative px-4 py-3 rounded-2xl max-w-[300px]",
            "backdrop-blur-xl border",
            isFromMe 
              ? "bg-gradient-to-r from-orange-500/90 to-orange-600/90 border-orange-400/30 text-white rounded-br-md" 
              : "bg-card/60 border-purple-500/20 text-foreground rounded-bl-md"
          )}
        >
          {/* Efeito de brilho */}
          <div 
            className={cn(
              "absolute inset-0 rounded-2xl opacity-20",
              isFromMe ? "bg-gradient-to-t from-transparent to-white/30" : "bg-gradient-to-t from-transparent to-purple-400/20"
            )}
          />
          
          <p className="relative text-sm">{message.content}</p>
          
          <div className={cn(
            "flex items-center justify-end gap-1.5 mt-1.5",
            isFromMe ? "text-orange-100" : "text-muted-foreground"
          )}>
            <span className="text-[10px]">{message.timestamp}</span>
            {isFromMe && (
              message.status === "read" 
                ? <CheckCheck className="w-3 h-3 text-cyan-300" />
                : message.status === "delivered"
                ? <CheckCheck className="w-3 h-3" />
                : message.status === "sent"
                ? <Check className="w-3 h-3" />
                : <Clock className="w-3 h-3" />
            )}
          </div>
        </div>
        
        {/* Linha de energia conectando */}
        <motion.div
          className={cn(
            "absolute top-1/2 w-8 h-[2px]",
            isFromMe ? "-right-8 bg-gradient-to-r from-orange-500/50 to-transparent" : "-left-8 bg-gradient-to-l from-purple-500/50 to-transparent"
          )}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
};

// Componente de Input Holográfico
const HolographicInput = ({ 
  value, 
  onChange, 
  onSend,
  onKeyDown,
  inputRef 
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Glow de fundo */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-orange-500/20 blur-xl" />
      
      {/* Container principal */}
      <div className="relative flex items-center gap-3 p-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-orange-500/20">
        {/* Botões de mídia */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-9 h-9 rounded-full text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Input */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Digite sua mensagem..."
            className="bg-transparent border-0 focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50"
          />
          
          {/* Linha de digitação animada */}
          {value.length > 0 && (
            <motion.div
              className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-orange-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(value.length * 3, 100)}%` }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          )}
        </div>
        
        {/* Botão de enviar */}
        <AnimatePresence mode="wait">
          {value.trim() ? (
            <motion.div
              key="send"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button
                onClick={onSend}
                size="icon"
                className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10"
              >
                <Mic className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Painel de Chat Expandido
const ExpandedChat = ({ 
  contact, 
  messages, 
  onClose,
  newMessage,
  onMessageChange,
  onSendMessage,
  onKeyDown,
  inputRef,
  messagesEndRef,
  theme,
}: {
  contact: Contact;
  messages: Message[];
  onClose: () => void;
  newMessage: string;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  theme: MessengerTheme;
}) => {
  const tagStyle = contact.tag ? tagGradients[contact.tag] : tagGradients.cliente;
  const styles = themeStyles[theme];
  
  return (
    <>
      {/* Backdrop clicável */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
      />
      
      {/* Painel de chat */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        transition={{ type: "spring", stiffness: 200 }}
        className={cn(
          "fixed inset-4 md:inset-8 lg:inset-12 z-50 flex flex-col rounded-3xl overflow-hidden border",
          styles.chatBorder
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fundo com blur */}
        <div className={cn("absolute inset-0", styles.chatBg)} />
        
        {/* Borda gradiente */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${tagStyle.from}20, ${tagStyle.to}20)`,
            padding: 1,
          }}
        />
        
        {/* Header */}
        <div className={cn("relative z-10 flex items-center justify-between p-4 border-b", styles.border)}>
          <div className="flex items-center gap-4">
            {/* Avatar com animação */}
            <motion.div
              className="relative"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: `linear-gradient(135deg, ${tagStyle.from}, ${tagStyle.to})` }}
              >
                {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              {contact.isOnline && (
                <motion.div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
            
            <div>
              <h2 className={cn("font-bold text-lg flex items-center gap-2", styles.text)}>
                {contact.name}
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ 
                    background: `linear-gradient(135deg, ${tagStyle.from}30, ${tagStyle.to}30)`,
                    color: tagStyle.from 
                  }}
                >
                  {contact.tag}
                </span>
              </h2>
              <p className={cn("text-sm", styles.textMuted)}>
                {contact.isOnline ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <Radio className="w-3 h-3" /> online
                  </span>
                ) : contact.phone}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn("rounded-full", theme === "light" ? "hover:bg-gray-100" : "hover:bg-foreground/10")}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Área de mensagens */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
          {/* Linhas de conexão animadas */}
          {theme === "colorful" && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full opacity-10">
                <motion.line
                  x1="10%"
                  y1="0"
                  x2="10%"
                  y2="100%"
                  stroke="url(#lineGradient)"
                  strokeWidth="1"
                  strokeDasharray="10 10"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2 }}
                />
                <motion.line
                  x1="90%"
                  y1="0"
                  x2="90%"
                  y2="100%"
                  stroke="url(#lineGradient)"
                  strokeWidth="1"
                  strokeDasharray="10 10"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 0.5 }}
                />
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={tagStyle.from} stopOpacity="0" />
                    <stop offset="50%" stopColor={tagStyle.from} stopOpacity="1" />
                    <stop offset="100%" stopColor={tagStyle.to} stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
          
          {messages.map((message, index) => (
            <EnergyMessage key={message.id} message={message} index={index} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="relative z-10 p-4">
          <HolographicInput
            value={newMessage}
            onChange={onMessageChange}
            onSend={onSendMessage}
            onKeyDown={onKeyDown}
            inputRef={inputRef}
          />
        </div>
      </motion.div>
    </>
  );
};

export default function Messenger() {
  const { user } = useAuth();
  const { empresaAtiva } = useEmpresaAtiva();
  
  const [contacts] = useState<Contact[]>(mockContacts);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Estado do tema persistido
  const [theme, setTheme] = useState<MessengerTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(THEME_STORAGE_KEY) as MessengerTheme) || "colorful";
    }
    return "colorful";
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedContact?.id]);

  const styles = themeStyles[theme];

  const cycleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === "colorful") return "dark";
      if (prev === "dark") return "light";
      return "colorful";
    });
  }, []);

  const filteredContacts = useMemo(() => 
    contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery)
    ), [contacts, searchQuery]
  );

  const contactMessages = useMemo(() => 
    selectedContact 
      ? messages.filter(m => m.contactId === selectedContact.id)
      : [],
    [selectedContact, messages]
  );

  const handleSendMessage = useCallback(() => {
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
  }, [newMessage, selectedContact]);

  const handleSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Organizar contatos por tag
  const groupedContacts = useMemo(() => {
    const groups: Record<string, Contact[]> = {
      cliente: [],
      fornecedor: [],
      interno: [],
    };
    filteredContacts.forEach(c => {
      if (c.tag) groups[c.tag].push(c);
      else groups.cliente.push(c);
    });
    return groups;
  }, [filteredContacts]);

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden relative", styles.bg)}>
      <NebulaBackground theme={theme} />
      
      {/* Header flutuante */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between p-4 md:p-6"
      >
        <div className="flex items-center gap-4">
          <motion.div
            className={cn(
              "p-3 rounded-2xl border",
              theme === "light" 
                ? "bg-orange-50 border-orange-200" 
                : "bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30"
            )}
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Sparkles className="w-6 h-6 text-orange-400" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Nebula Messenger
            </h1>
            <p className={cn("text-sm", styles.textMuted)}>{empresaAtiva?.nome || "VAULT"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão de tema */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className={cn(
              "rounded-full",
              theme === "light" 
                ? "hover:bg-gray-100 text-gray-500 hover:text-orange-500" 
                : "hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400"
            )}
            title={`Tema: ${theme}`}
          >
            {theme === "colorful" && <Palette className="w-5 h-5" />}
            {theme === "dark" && <Moon className="w-5 h-5" />}
            {theme === "light" && <Sun className="w-5 h-5" />}
          </Button>
          
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className={cn(styles.input, styles.inputBorder)}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "rounded-full",
              theme === "light" 
                ? "hover:bg-gray-100 text-gray-500 hover:text-orange-500" 
                : "hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400"
            )}
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full",
              theme === "light" 
                ? "hover:bg-gray-100 text-gray-500 hover:text-orange-500" 
                : "hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400"
            )}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>
      
      {/* Área principal com orbes */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        {/* Constelações de contatos por grupo */}
        {Object.entries(groupedContacts).map(([tag, groupContacts], groupIndex) => (
          groupContacts.length > 0 && (
            <motion.div
              key={tag}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: groupIndex * 0.2 }}
              className="mb-12"
            >
              {/* Label do grupo */}
              <motion.div 
                className="text-center mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span 
                  className="text-xs font-medium px-4 py-1.5 rounded-full border"
                  style={{ 
                    background: `linear-gradient(135deg, ${tagGradients[tag].from}20, ${tagGradients[tag].to}20)`,
                    borderColor: `${tagGradients[tag].from}30`,
                    color: tagGradients[tag].from 
                  }}
                >
                  <Zap className="w-3 h-3 inline mr-1" />
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}s
                </span>
              </motion.div>
              
              {/* Orbes do grupo */}
              <div className="flex flex-wrap justify-center gap-8">
                {groupContacts.map((contact, index) => (
                  <ContactOrb
                    key={contact.id}
                    contact={contact}
                    isSelected={selectedContact?.id === contact.id}
                    onClick={() => handleSelectContact(contact)}
                    index={groupIndex * 10 + index}
                  />
                ))}
              </div>
            </motion.div>
          )
        ))}
        
        {/* Mensagem se não houver contatos */}
        {filteredContacts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum contato encontrado</p>
          </motion.div>
        )}
      </div>
      
      {/* Status da API */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 p-4 flex justify-center"
      >
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full border",
          theme === "light" 
            ? "bg-white shadow-md border-gray-200" 
            : "bg-card/40 backdrop-blur-xl border-orange-500/20"
        )}>
          <motion.div
            className="w-2 h-2 rounded-full bg-orange-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs text-orange-400">Aguardando conexão com API Business</span>
        </div>
      </motion.div>
      
      {/* Chat expandido */}
      <AnimatePresence>
        {selectedContact && (
          <ExpandedChat
            contact={selectedContact}
            messages={contactMessages}
            onClose={() => setSelectedContact(null)}
            newMessage={newMessage}
            onMessageChange={handleInputChange}
            onSendMessage={handleSendMessage}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            messagesEndRef={messagesEndRef}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
