import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, X, Send, Mic, Paperclip, Radio, 
  ChevronLeft, ChevronRight, Check, CheckCheck, Clock,
  Sparkles, Palette, Sun, Moon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { useEmpresaAtiva } from '@/hooks/useEmpresaAtiva';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Types
interface Contact {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  tag: 'cliente' | 'fornecedor' | 'interno';
  isOnline?: boolean;
  unread?: number;
  lastMessage?: string;
}

interface Message {
  id: string;
  content: string;
  isFromMe: boolean;
  timestamp: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
}

// Theme types
type IslandTheme = 'colorful' | 'dark' | 'light';

// Mock data - replace with real data from Supabase
const mockContacts: Contact[] = [
  { id: '1', name: 'João Silva', tag: 'cliente', isOnline: true, unread: 3, lastMessage: 'Preciso do relatório', phone: '(11) 99999-1111' },
  { id: '2', name: 'Maria Santos', tag: 'fornecedor', isOnline: false, unread: 1, lastMessage: 'NF enviada', phone: '(11) 99999-2222' },
  { id: '3', name: 'Carlos Equipe', tag: 'interno', isOnline: true, unread: 2, lastMessage: 'Reunião às 15h', phone: '(11) 99999-3333' },
  { id: '4', name: 'Ana Paula', tag: 'cliente', isOnline: true, unread: 0, lastMessage: 'Obrigada!', phone: '(11) 99999-4444' },
  { id: '5', name: 'Pedro Costa', tag: 'fornecedor', isOnline: false, unread: 1, lastMessage: 'Pedido confirmado', phone: '(11) 99999-5555' },
  { id: '6', name: 'Lucia Mendes', tag: 'interno', isOnline: true, unread: 0, lastMessage: 'Tudo certo', phone: '(11) 99999-6666' },
  { id: '7', name: 'Roberto Lima', tag: 'cliente', isOnline: false, unread: 2, lastMessage: 'Aguardando retorno', phone: '(11) 99999-7777' },
  { id: '8', name: 'Fernanda Dias', tag: 'fornecedor', isOnline: true, unread: 0, lastMessage: 'Enviado!', phone: '(11) 99999-8888' },
];

const mockMessages: Message[] = [
  { id: '1', content: 'Olá! Tudo bem?', isFromMe: false, timestamp: '10:00' },
  { id: '2', content: 'Oi João! Tudo sim, e você?', isFromMe: true, timestamp: '10:02', status: 'read' },
  { id: '3', content: 'Preciso enviar alguns documentos para vocês', isFromMe: false, timestamp: '10:15' },
  { id: '4', content: 'Claro! Pode enviar por aqui mesmo', isFromMe: true, timestamp: '10:18', status: 'read' },
  { id: '5', content: 'Ok, vou enviar os documentos', isFromMe: false, timestamp: '10:30' },
];

// Theme configurations — orange, blue, green palette
const themeConfigs = {
  colorful: {
    tagGradients: {
      cliente: { from: '#f97316', to: '#ea580c' },
      fornecedor: { from: '#3b82f6', to: '#2563eb' },
      interno: { from: '#22c55e', to: '#16a34a' },
    },
    island: {
      bg: 'bg-black/70',
      border: 'border-white/10',
      glow: 'from-orange-500/30 via-blue-500/30 to-green-500/30',
    },
    button: {
      bg: 'bg-white/10',
      hover: 'hover:bg-white/20',
      text: 'text-white/60',
      hoverText: 'hover:text-white',
    },
    chat: {
      backdrop: 'bg-black/60',
      panel: 'bg-zinc-900/90',
      border: 'border-white/10',
      header: 'border-white/10',
      text: 'text-white',
      textMuted: 'text-white/60',
      input: 'bg-zinc-800/60 border-orange-500/20',
      messageMine: 'from-orange-500/90 to-orange-600/90 border-orange-400/30 text-white',
      messageOther: 'bg-zinc-800/80 border-blue-500/30 text-white',
    },
  },
  dark: {
    tagGradients: {
      cliente: { from: '#c2410c', to: '#9a3412' },
      fornecedor: { from: '#1d4ed8', to: '#1e3a8a' },
      interno: { from: '#15803d', to: '#166534' },
    },
    island: {
      bg: 'bg-zinc-950/98',
      border: 'border-zinc-800',
      glow: 'from-zinc-700/10 via-zinc-600/5 to-zinc-700/10',
    },
    button: {
      bg: 'bg-zinc-800/80',
      hover: 'hover:bg-zinc-700',
      text: 'text-zinc-400',
      hoverText: 'hover:text-zinc-100',
    },
    chat: {
      backdrop: 'bg-black/70',
      panel: 'bg-zinc-950/98',
      border: 'border-zinc-800',
      header: 'border-zinc-800',
      text: 'text-zinc-100',
      textMuted: 'text-zinc-400',
      input: 'bg-zinc-900 border-zinc-700',
      messageMine: 'from-zinc-700 to-zinc-800 border-zinc-600 text-zinc-100',
      messageOther: 'bg-zinc-900 border-zinc-700 text-zinc-200',
    },
  },
  light: {
    tagGradients: {
      cliente: { from: '#f97316', to: '#ea580c' },
      fornecedor: { from: '#3b82f6', to: '#2563eb' },
      interno: { from: '#22c55e', to: '#16a34a' },
    },
    island: {
      bg: 'bg-white',
      border: 'border-gray-300',
      glow: 'from-orange-100/30 via-blue-100/30 to-green-100/30',
    },
    button: {
      bg: 'bg-gray-100',
      hover: 'hover:bg-gray-200',
      text: 'text-gray-600',
      hoverText: 'hover:text-gray-900',
    },
    chat: {
      backdrop: 'bg-black/30',
      panel: 'bg-white',
      border: 'border-gray-200',
      header: 'border-gray-200',
      text: 'text-gray-900',
      textMuted: 'text-gray-500',
      input: 'bg-gray-100 border-gray-300',
      messageMine: 'from-orange-500 to-orange-600 border-orange-400 text-white',
      messageOther: 'bg-gray-100 border-gray-200 text-gray-900',
    },
  },
};

// Energy Message Component
const EnergyMessage = React.memo(({ message, index, theme }: { message: Message; index: number; theme: IslandTheme }) => {
  const isFromMe = message.isFromMe;
  const themeConfig = themeConfigs[theme];
  const showGlow = theme === 'colorful';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isFromMe ? 50 : -50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
      className={cn("flex", isFromMe ? "justify-end" : "justify-start")}
    >
      <div className="relative group">
        {/* Glow de fundo - only for colorful theme */}
        {showGlow && (
          <div
            className={cn(
              "absolute inset-0 rounded-2xl blur-lg opacity-30",
              isFromMe ? "bg-orange-500" : "bg-purple-500"
            )}
          />
        )}
        
        {/* Container da mensagem */}
        <div
          className={cn(
            "relative px-4 py-3 rounded-2xl max-w-[300px]",
            "backdrop-blur-xl border",
            isFromMe 
              ? cn("bg-gradient-to-r rounded-br-md", themeConfig.chat.messageMine)
              : cn("rounded-bl-md", themeConfig.chat.messageOther)
          )}
        >
          {/* Efeito de brilho - only for colorful */}
          {showGlow && (
            <div 
              className={cn(
                "absolute inset-0 rounded-2xl opacity-20",
                isFromMe ? "bg-gradient-to-t from-transparent to-white/30" : "bg-gradient-to-t from-transparent to-purple-400/20"
              )}
            />
          )}
          
          <p className="relative text-sm">{message.content}</p>
          
          <div className={cn(
            "flex items-center justify-end gap-1.5 mt-1.5",
            isFromMe 
              ? theme === 'light' ? 'text-orange-100' : 'text-white/70'
              : themeConfig.chat.textMuted
          )}>
            <span className="text-[10px]">{message.timestamp}</span>
            {isFromMe && (
              message.status === "read" 
                ? <CheckCheck className={cn("w-3 h-3", theme === 'colorful' ? 'text-cyan-300' : theme === 'light' ? 'text-cyan-200' : 'text-zinc-400')} />
                : message.status === "delivered"
                ? <CheckCheck className="w-3 h-3" />
                : message.status === "sent"
                ? <Check className="w-3 h-3" />
                : <Clock className="w-3 h-3" />
            )}
          </div>
        </div>
        
        {/* Linha de energia conectando - only for colorful */}
        {showGlow && (
          <motion.div
            className={cn(
              "absolute top-1/2 w-8 h-[2px]",
              isFromMe ? "-right-8 bg-gradient-to-r from-orange-500/50 to-transparent" : "-left-8 bg-gradient-to-l from-purple-500/50 to-transparent"
            )}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
});

EnergyMessage.displayName = 'EnergyMessage';

// Holographic Input Component
const HolographicInput = React.memo(({ 
  value, 
  onChange, 
  onSend,
  onKeyDown,
  inputRef,
  theme
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  theme: IslandTheme;
}) => {
  const themeConfig = themeConfigs[theme];
  const showGlow = theme === 'colorful';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Glow de fundo - only for colorful */}
      {showGlow && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-orange-500/20 blur-xl" />
      )}
      
      {/* Barra de progresso de digitação - mais destacada */}
      <motion.div
        className={cn(
          "absolute -top-1 left-3 right-3 h-1 rounded-full overflow-hidden",
          theme === 'light' ? 'bg-gray-200' : 'bg-white/10'
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: value.length > 0 ? 1 : 0 }}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            theme === 'dark' 
              ? 'bg-gradient-to-r from-zinc-400 to-zinc-300' 
              : 'bg-gradient-to-r from-orange-500 via-purple-500 to-cyan-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value.length * 2, 100)}%` }}
          transition={{ type: "spring", stiffness: 300 }}
        />
      </motion.div>
      
      {/* Container principal */}
      <div className={cn(
        "relative flex items-end gap-3 p-3 rounded-2xl backdrop-blur-xl border",
        themeConfig.chat.input
      )}>
        {/* Botões de mídia */}
        <div className="flex items-center gap-1 pb-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "w-9 h-9 rounded-full",
              theme === 'light' 
                ? 'text-gray-500 hover:text-orange-500 hover:bg-orange-100' 
                : 'text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10'
            )}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Textarea com quebra de linha */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Digite sua mensagem..."
            rows={1}
            className={cn(
              "w-full bg-transparent border-0 focus:outline-none focus:ring-0 px-0 py-1 resize-none",
              "min-h-[24px] max-h-[120px] overflow-y-auto",
              theme === 'light' 
                ? 'text-gray-900 placeholder:text-gray-400' 
                : 'text-white placeholder:text-zinc-500'
            )}
            style={{
              height: 'auto',
              minHeight: '24px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
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
                className={cn(
                  "w-10 h-10 rounded-full shadow-lg",
                  theme === 'dark'
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/30'
                )}
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
                className={cn(
                  "w-10 h-10 rounded-full",
                  theme === 'light'
                    ? 'text-gray-500 hover:text-orange-500 hover:bg-orange-100'
                    : 'text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10'
                )}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

HolographicInput.displayName = 'HolographicInput';

// Expanded Chat Panel - igual ao Messenger
const ExpandedChatPanel = React.memo(({ 
  contact, 
  messages, 
  onClose,
  newMessage,
  onMessageChange,
  onSendMessage,
  inputRef,
  messagesEndRef,
  theme,
}: {
  contact: Contact;
  messages: Message[];
  onClose: () => void;
  newMessage: string;
  onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  theme: IslandTheme;
}) => {
  const themeConfig = themeConfigs[theme];
  const tagStyle = contact.tag ? themeConfig.tagGradients[contact.tag] : themeConfig.tagGradients.cliente;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [onSendMessage]);
  
  return (
    <>
      {/* Backdrop - fecha ao clicar fora */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={cn("fixed inset-0 z-[59] backdrop-blur-sm", themeConfig.chat.backdrop)}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="fixed inset-4 md:inset-8 lg:inset-12 z-[60] flex flex-col rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fundo com blur */}
        <div className={cn("absolute inset-0 backdrop-blur-2xl", themeConfig.chat.panel)} />
      
      {/* Borda gradiente */}
      <div 
        className={cn("absolute inset-0 rounded-3xl border", themeConfig.chat.border)}
        style={{
          background: theme === 'colorful' ? `linear-gradient(135deg, ${tagStyle.from}20, ${tagStyle.to}20)` : undefined,
        }}
      />
      
      {/* Header */}
      <div className={cn("relative z-10 flex items-center justify-between p-4 border-b", themeConfig.chat.header)}>
        <div className="flex items-center gap-4">
          {/* Avatar com animação */}
          <motion.div
            className="relative"
            animate={theme === 'colorful' ? { rotate: [0, 5, -5, 0] } : {}}
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
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-2",
                  theme === 'light' ? 'border-white' : 'border-zinc-900'
                )}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
          
          <div>
            <h2 className={cn("font-bold text-lg flex items-center gap-2", themeConfig.chat.text)}>
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
            <p className={cn("text-sm", themeConfig.chat.textMuted)}>
              {contact.isOnline ? (
                <span className="text-green-500 flex items-center gap-1">
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
          className={cn(
            "rounded-full",
            theme === 'light' ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white'
          )}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Área de mensagens */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        {/* Linhas de conexão animadas - only for colorful */}
        {theme === 'colorful' && (
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
                <linearGradient id="lineGradientFloat" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={tagStyle.from} stopOpacity="0" />
                  <stop offset="50%" stopColor={tagStyle.from} stopOpacity="1" />
                  <stop offset="100%" stopColor={tagStyle.to} stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
        
        {messages.map((message, index) => (
          <EnergyMessage key={message.id} message={message} index={index} theme={theme} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="relative z-10 p-4">
        <HolographicInput
          value={newMessage}
          onChange={onMessageChange}
          onSend={onSendMessage}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          theme={theme}
        />
      </div>
    </motion.div>
    </>
  );
});

ExpandedChatPanel.displayName = 'ExpandedChatPanel';

// Floating Island — Orbital Nebula System
const FloatingIsland = React.memo(({ 
  contacts, 
  onContactSelect,
  isVisible,
  onToggle,
  onOpenMessenger,
  theme,
  onThemeChange
}: { 
  contacts: Contact[];
  onContactSelect: (contact: Contact) => void;
  isVisible: boolean;
  onToggle: () => void;
  onOpenMessenger: () => void;
  theme: IslandTheme;
  onThemeChange: (theme: IslandTheme) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const themeConfig = themeConfigs[theme];
  
  const contactsWithActivity = contacts.filter(c => (c.unread && c.unread > 0) || c.isOnline);
  const totalUnread = contacts.reduce((acc, c) => acc + (c.unread || 0), 0);
  const displayContacts = contactsWithActivity.slice(0, 8);

  const cycleTheme = useCallback(() => {
    const themes: IslandTheme[] = ['colorful', 'dark', 'light'];
    const currentIdx = themes.indexOf(theme);
    onThemeChange(themes[(currentIdx + 1) % themes.length]);
  }, [theme, onThemeChange]);

  const getThemeIcon = () => {
    switch (theme) {
      case 'colorful': return <Palette className="w-3 h-3" />;
      case 'dark': return <Moon className="w-3 h-3" />;
      case 'light': return <Sun className="w-3 h-3" />;
    }
  };

  if (contactsWithActivity.length === 0) return null;

  // Calculate orbital positions — contacts fan out upward-right from bottom-left core
  const getOrbitalPosition = (index: number, total: number) => {
    const arcStart = -Math.PI * 0.5;  // straight up
    const arcEnd = 0;                  // straight right
    const angle = total === 1 
      ? (arcStart + arcEnd) / 2 
      : arcStart + (index / (total - 1)) * (arcEnd - arcStart);
    const radius = 56 + (index % 2) * 14; // staggered radius for depth
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  return (
    <>
      {/* Core Orb — always visible when not hidden */}
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={onToggle}
            className="fixed bottom-6 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            {/* Ambient glow */}
            <motion.div
              className="absolute inset-[-4px] rounded-full bg-gradient-to-br from-orange-500/40 to-blue-500/40 blur-md"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center shadow-lg shadow-orange-500/30 border border-white/20">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            {totalUnread > 0 && (
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {totalUnread}
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Orbital System — visible state */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="fixed bottom-6 left-4 z-50"
          >
            {/* Orbital field glow */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 pointer-events-none"
                >
                  <div className={cn(
                    "absolute inset-0 rounded-full blur-3xl opacity-20 bg-gradient-to-br",
                    theme === 'colorful' ? 'from-orange-500 via-blue-500 to-green-500' 
                      : theme === 'dark' ? 'from-zinc-600 to-zinc-700'
                      : 'from-orange-200 to-blue-200'
                  )} />
                  {/* Orbit ring */}
                  <motion.div
                    className={cn(
                      "absolute inset-2 rounded-full border border-dashed",
                      theme === 'colorful' ? 'border-orange-500/15' 
                        : theme === 'dark' ? 'border-zinc-700/30'
                        : 'border-gray-300/40'
                    )}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Orbital Contacts */}
            <AnimatePresence>
              {isExpanded && displayContacts.map((contact, index) => {
                const pos = getOrbitalPosition(index, displayContacts.length);
                const tagStyle = themeConfig.tagGradients[contact.tag];
                return (
                  <motion.button
                    key={contact.id}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      x: pos.x, 
                      y: pos.y, 
                      opacity: 1,
                    }}
                    exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                    transition={{ 
                      type: 'spring', 
                      damping: 15, 
                      stiffness: 200,
                      delay: index * 0.04 
                    }}
                    onClick={() => onContactSelect(contact)}
                    className="absolute top-1 left-1 z-10 group"
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {/* Rotating energy ring */}
                    <motion.div
                      className="absolute inset-[-3px] rounded-full opacity-60"
                      style={{ 
                        background: `conic-gradient(from 0deg, ${tagStyle.from}, transparent, ${tagStyle.to}, transparent, ${tagStyle.from})` 
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6 + index, repeat: Infinity, ease: 'linear' }}
                    />
                    
                    {/* Contact orb */}
                    <div
                      className="relative w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-lg overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${tagStyle.from}, ${tagStyle.to})` }}
                    >
                      {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                    </div>
                    
                    {/* Online pulse */}
                    {contact.isOnline && (
                      <motion.div
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black shadow-lg shadow-green-400/50"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                    
                    {/* Unread badge */}
                    {contact.unread && contact.unread > 0 && (
                      <motion.div
                        className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white shadow-lg border border-white/30"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        {contact.unread}
                      </motion.div>
                    )}

                    {/* Tooltip */}
                    <motion.div
                      className={cn(
                        "absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg backdrop-blur-xl border",
                        "opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-30",
                        theme === 'light' 
                          ? 'bg-white border-gray-200 shadow-lg'
                          : 'bg-black/90 border-white/10'
                      )}
                    >
                      <p className={cn("text-[10px] font-medium", theme === 'light' ? 'text-gray-900' : 'text-white')}>{contact.name}</p>
                      {contact.lastMessage && (
                        <p className={cn("text-[9px]", theme === 'light' ? 'text-gray-500' : 'text-white/50')}>{contact.lastMessage}</p>
                      )}
                    </motion.div>
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {/* Utility satellites — shown when expanded */}
            <AnimatePresence>
              {isExpanded && (
                <>
                  {/* Theme toggle — orbit top-left */}
                  <motion.button
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{ scale: 1, x: 40, y: -8 }}
                    exit={{ scale: 0, x: 0, y: 0 }}
                    transition={{ type: 'spring', delay: 0.15 }}
                    onClick={cycleTheme}
                    className={cn(
                      "absolute top-0.5 left-0.5 z-10 w-6 h-6 rounded-full flex items-center justify-center",
                      theme === 'light' 
                        ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                        : 'bg-white/10 border border-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                    )}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    title={`Tema: ${theme}`}
                  >
                    {getThemeIcon()}
                  </motion.button>

                  {/* Open Messenger — orbit top-right */}
                  <motion.button
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{ scale: 1, x: 8, y: -40 }}
                    exit={{ scale: 0, x: 0, y: 0 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    onClick={onOpenMessenger}
                    className={cn(
                      "absolute top-0.5 left-0.5 z-10 w-6 h-6 rounded-full flex items-center justify-center",
                      theme === 'light' 
                        ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-orange-100 hover:text-orange-600'
                        : 'bg-white/10 border border-white/10 text-white/60 hover:bg-orange-500/20 hover:text-orange-400'
                    )}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    title="Abrir Messenger"
                  >
                    <Sparkles className="w-3 h-3" />
                  </motion.button>
                </>
              )}
            </AnimatePresence>

            {/* Core Orb — the "sun" of the system */}
            <motion.button
              onClick={() => setIsExpanded(prev => !prev)}
              className="relative z-20 w-9 h-9 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {/* Breathing ambient glow */}
              <motion.div
                className={cn(
                  "absolute inset-[-6px] rounded-full blur-lg",
                  theme === 'colorful' ? 'bg-gradient-to-br from-orange-500/50 to-blue-500/50'
                    : theme === 'dark' ? 'bg-zinc-500/20'
                    : 'bg-orange-300/30'
                )}
                animate={{ 
                  scale: isExpanded ? [1, 1.2, 1] : [1, 1.4, 1],
                  opacity: isExpanded ? [0.4, 0.6, 0.4] : [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              {/* Orb body */}
              <div className={cn(
                "relative w-full h-full rounded-full flex items-center justify-center shadow-xl border overflow-hidden",
                theme === 'colorful' 
                  ? 'bg-gradient-to-br from-orange-500 to-blue-600 border-white/20 shadow-orange-500/30'
                  : theme === 'dark'
                  ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 border-zinc-600 shadow-zinc-800/50'
                  : 'bg-gradient-to-br from-orange-400 to-blue-500 border-white shadow-orange-400/20'
              )}>
                <AnimatePresence mode="wait">
                  {isExpanded ? (
                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                      <X className="w-4 h-4 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                      <MessageCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Inner shine */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/15 pointer-events-none" />
              </div>

              {/* Unread badge */}
              {totalUnread > 0 && !isExpanded && (
                <motion.div
                  className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white shadow-lg shadow-red-500/40 border border-white/30"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {totalUnread}
                </motion.div>
              )}
            </motion.button>

            {/* Hide button — bottom when expanded */}
            <AnimatePresence>
              {isExpanded && (
                <motion.button
                  initial={{ scale: 0, x: 0 }}
                  animate={{ scale: 1, x: 42 }}
                  exit={{ scale: 0, x: 0 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  onClick={onToggle}
                  className={cn(
                    "absolute top-0 left-0 z-10 w-5 h-5 rounded-full flex items-center justify-center",
                    theme === 'light'
                      ? 'bg-gray-100 border border-gray-300 text-gray-400 hover:text-red-500 hover:bg-red-50'
                      : 'bg-white/5 border border-white/10 text-white/30 hover:text-red-400 hover:bg-red-500/10'
                  )}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  title="Ocultar"
                >
                  <X className="w-2.5 h-2.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

FloatingIsland.displayName = 'FloatingIsland';

// Main Component
export const FloatingMessengerOrbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, hasModuleAccessFlexible, loading: permissionsLoading } = useModulePermissions();
  const { empresaAtiva } = useEmpresaAtiva();

  const [isIslandVisible, setIsIslandVisible] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [islandTheme, setIslandTheme] = useState<IslandTheme>(() => {
    // Persist theme preference in localStorage
    const saved = localStorage.getItem('messenger-island-theme');
    return (saved as IslandTheme) || 'colorful';
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Verificar se usuário tem permissão ao módulo messenger usando verificação flexível
  const hasMessengerAccess = useMemo(() => {
    if (isAdmin) return true;
    if (permissionsLoading) return false;
    return hasModuleAccessFlexible('messenger', empresaAtiva?.id);
  }, [isAdmin, permissionsLoading, empresaAtiva?.id, hasModuleAccessFlexible]);

  // Don't show on messenger page, auth pages, landing, or if no permission
  const hiddenRoutes = ['/messenger', '/auth', '/master', '/'];
  const shouldShow = useMemo(() => {
    return user && hasMessengerAccess && !hiddenRoutes.includes(location.pathname);
  }, [user, hasMessengerAccess, location.pathname]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedContact?.id]);

  // Focus input when chat opens
  useEffect(() => {
    if (selectedContact) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedContact]);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('messenger-island-theme', islandTheme);
  }, [islandTheme]);

  const handleContactSelect = useCallback((contact: Contact) => {
    setSelectedContact(contact);
  }, []);

  const handleCloseChat = useCallback(() => {
    setSelectedContact(null);
    setNewMessage("");
  }, []);

  const handleToggleIsland = useCallback(() => {
    setIsIslandVisible(prev => !prev);
  }, []);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (newMessage.trim() && selectedContact) {
      const msg: Message = {
        id: Date.now().toString(),
        content: newMessage.trim(),
        isFromMe: true,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      };
      setMessages(prev => [...prev, msg]);
      setNewMessage("");
    }
  }, [newMessage, selectedContact]);

  const handleOpenMessenger = useCallback(() => {
    navigate('/messenger');
  }, [navigate]);

  const handleThemeChange = useCallback((theme: IslandTheme) => {
    setIslandTheme(theme);
  }, []);

  if (!shouldShow) return null;

  return (
    <>
      <FloatingIsland
        contacts={mockContacts}
        onContactSelect={handleContactSelect}
        isVisible={isIslandVisible}
        onToggle={handleToggleIsland}
        onOpenMessenger={handleOpenMessenger}
        theme={islandTheme}
        onThemeChange={handleThemeChange}
      />

      <AnimatePresence>
        {selectedContact && (
          <ExpandedChatPanel
            contact={selectedContact}
            messages={messages}
            onClose={handleCloseChat}
            newMessage={newMessage}
            onMessageChange={handleMessageChange}
            onSendMessage={handleSendMessage}
            inputRef={inputRef}
            messagesEndRef={messagesEndRef}
            theme={islandTheme}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingMessengerOrbs;
