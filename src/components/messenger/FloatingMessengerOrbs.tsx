import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, X, Send, Mic, Paperclip, Radio, 
  ChevronLeft, ChevronRight, Check, CheckCheck, Clock,
  Sparkles, Palette, Sun, Moon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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

// Theme configurations
const themeConfigs = {
  colorful: {
    tagGradients: {
      cliente: { from: '#f97316', to: '#ea580c' },
      fornecedor: { from: '#8b5cf6', to: '#7c3aed' },
      interno: { from: '#06b6d4', to: '#0891b2' },
    },
    island: {
      bg: 'bg-black/70',
      border: 'border-white/10',
      glow: 'from-orange-500/30 via-violet-500/30 to-cyan-500/30',
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
      messageOther: 'bg-zinc-800/80 border-purple-500/30 text-white',
    },
  },
  dark: {
    tagGradients: {
      cliente: { from: '#64748b', to: '#475569' },
      fornecedor: { from: '#6b7280', to: '#4b5563' },
      interno: { from: '#71717a', to: '#52525b' },
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
      fornecedor: { from: '#8b5cf6', to: '#7c3aed' },
      interno: { from: '#10b981', to: '#059669' },
    },
    island: {
      bg: 'bg-white',
      border: 'border-gray-300',
      glow: 'from-orange-100/30 via-violet-100/30 to-emerald-100/30',
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

// Floating Island with Carousel
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const VISIBLE_COUNT = 6;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const themeConfig = themeConfigs[theme];
  
  const contactsWithActivity = contacts.filter(c => c.unread && c.unread > 0 || c.isOnline);
  const totalUnread = contacts.reduce((acc, c) => acc + (c.unread || 0), 0);
  
  const visibleContacts = useMemo(() => {
    const start = currentIndex;
    const end = start + VISIBLE_COUNT;
    // Circular array
    const result: Contact[] = [];
    for (let i = start; i < end; i++) {
      result.push(contactsWithActivity[i % contactsWithActivity.length]);
    }
    return result;
  }, [contactsWithActivity, currentIndex]);

  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex + VISIBLE_COUNT < contactsWithActivity.length;

  const scrollLeft = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const scrollRight = useCallback(() => {
    setCurrentIndex(prev => Math.min(contactsWithActivity.length - VISIBLE_COUNT, prev + 1));
  }, [contactsWithActivity.length]);

  const cycleTheme = useCallback(() => {
    const themes: IslandTheme[] = ['colorful', 'dark', 'light'];
    const currentIdx = themes.indexOf(theme);
    const nextIdx = (currentIdx + 1) % themes.length;
    onThemeChange(themes[nextIdx]);
  }, [theme, onThemeChange]);

  const getThemeIcon = () => {
    switch (theme) {
      case 'colorful': return <Palette className="w-3 h-3" />;
      case 'dark': return <Moon className="w-3 h-3" />;
      case 'light': return <Sun className="w-3 h-3" />;
    }
  };

  if (contactsWithActivity.length === 0) return null;

  return (
    <>
      {/* Toggle Button quando minimizado */}
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 100 }}
            onClick={onToggle}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 
                       w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/30 to-violet-500/30
                       backdrop-blur-xl border border-white/20 shadow-2xl
                       flex items-center justify-center group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageCircle className="w-6 h-6 text-white" />
            {totalUnread > 0 && (
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500
                           flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-red-500/50"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                {totalUnread}
              </motion.div>
            )}
            {/* Pulse */}
            {totalUnread > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full bg-orange-500/30"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Island - Compact and positioned to avoid sidebar */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-6 left-4 right-72 z-50 flex justify-center pointer-events-none"
          >
            {/* Glow effect - themed */}
            <div className={cn(
              "absolute inset-0 -z-10 rounded-full bg-gradient-to-r blur-2xl scale-110 pointer-events-none",
              themeConfig.island.glow
            )} />
            
            {/* Island container - Compact & themed */}
            <div 
              ref={containerRef}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-2xl shadow-2xl pointer-events-auto border",
                themeConfig.island.bg,
                themeConfig.island.border
              )}
            >
              {/* Left arrow - themed */}
              <motion.button
                onClick={scrollLeft}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  canScrollLeft 
                    ? cn(themeConfig.button.bg, themeConfig.button.hover, theme === 'light' ? 'text-gray-600' : 'text-white')
                    : theme === 'light' ? 'text-gray-300 cursor-not-allowed' : 'text-white/20 cursor-not-allowed'
                )}
                whileHover={canScrollLeft ? { scale: 1.1 } : {}}
                whileTap={canScrollLeft ? { scale: 0.9 } : {}}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="w-3 h-3" />
              </motion.button>

              {/* Orbs - Compact & themed */}
              <div className="flex items-center gap-2 px-1">
                {visibleContacts.map((contact, index) => {
                  const tagStyle = themeConfig.tagGradients[contact.tag];
                  return (
                    <motion.button
                      key={`${contact.id}-${index}`}
                      onClick={() => onContactSelect(contact)}
                      className="relative group"
                      initial={{ scale: 0, y: 10 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ delay: index * 0.03, type: 'spring' }}
                      whileHover={{ scale: 1.15, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Rotating ring */}
                      <motion.div
                        className="absolute inset-[-2px] rounded-full opacity-50"
                        style={{ 
                          background: `conic-gradient(from 0deg, ${tagStyle.from}, ${tagStyle.to}, ${tagStyle.from})` 
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      />
                      
                      {/* Orb - Smaller */}
                      <div
                        className="relative w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs
                                   shadow-lg overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${tagStyle.from}, ${tagStyle.to})` }}
                      >
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        
                        {/* Inner glow */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                      </div>
                      
                      {/* Online indicator - smaller */}
                      {contact.isOnline && (
                        <motion.div
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 
                                     border-2 border-black shadow-lg shadow-green-400/50"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                      
                      {/* Unread badge - red notification */}
                      {contact.unread && contact.unread > 0 && (
                        <motion.div
                          className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full 
                                     bg-gradient-to-br from-red-500 to-red-600
                                     flex items-center justify-center text-[10px] font-bold text-white
                                     shadow-lg shadow-red-500/50 border-2 border-white"
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        >
                          {contact.unread}
                        </motion.div>
                      )}

                      {/* Tooltip */}
                      <motion.div
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 
                                   rounded-lg bg-black/90 backdrop-blur-xl border border-white/10
                                   opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap
                                   transition-opacity"
                      >
                        <p className="text-xs font-medium text-white">{contact.name}</p>
                        <p className="text-[10px] text-white/60">{contact.lastMessage}</p>
                      </motion.div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Right arrow - themed */}
              <motion.button
                onClick={scrollRight}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  canScrollRight 
                    ? cn(themeConfig.button.bg, themeConfig.button.hover, theme === 'light' ? 'text-gray-600' : 'text-white')
                    : theme === 'light' ? 'text-gray-300 cursor-not-allowed' : 'text-white/20 cursor-not-allowed'
                )}
                whileHover={canScrollRight ? { scale: 1.1 } : {}}
                whileTap={canScrollRight ? { scale: 0.9 } : {}}
                disabled={!canScrollRight}
              >
                <ChevronRight className="w-3 h-3" />
              </motion.button>

              {/* Separator */}
              <div className={cn("w-px h-6 mx-0.5", theme === 'light' ? 'bg-gray-300' : 'bg-white/10')} />

              {/* Theme toggle button */}
              <motion.button
                onClick={cycleTheme}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                  themeConfig.button.bg, themeConfig.button.hover, themeConfig.button.text, themeConfig.button.hoverText
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={`Tema: ${theme === 'colorful' ? 'Colorido' : theme === 'dark' ? 'Escuro' : 'Claro'}`}
              >
                {getThemeIcon()}
              </motion.button>

              {/* Open full messenger */}
              <motion.button
                onClick={onOpenMessenger}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                  themeConfig.button.bg, themeConfig.button.hover, themeConfig.button.text, themeConfig.button.hoverText
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Abrir Messenger"
              >
                <Sparkles className="w-3 h-3" />
              </motion.button>

              {/* Close island */}
              <motion.button
                onClick={onToggle}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                  themeConfig.button.bg, 
                  "hover:bg-red-500/20",
                  themeConfig.button.text,
                  "hover:text-red-400"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3 h-3" />
              </motion.button>
            </div>
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

  // Don't show on messenger page, auth pages, or landing
  const hiddenRoutes = ['/messenger', '/auth', '/master', '/'];
  const shouldShow = useMemo(() => {
    return user && !hiddenRoutes.includes(location.pathname);
  }, [user, location.pathname]);

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
