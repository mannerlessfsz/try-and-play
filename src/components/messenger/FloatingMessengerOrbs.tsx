import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, X, Send, Mic, Paperclip, Radio, 
  ChevronLeft, ChevronRight, Check, CheckCheck, Clock,
  Sparkles
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

// Tag colors
const tagGradients = {
  cliente: { from: '#f97316', to: '#ea580c' },
  fornecedor: { from: '#8b5cf6', to: '#7c3aed' },
  interno: { from: '#06b6d4', to: '#0891b2' },
};

// Energy Message Component
const EnergyMessage = React.memo(({ message, index }: { message: Message; index: number }) => {
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
});

EnergyMessage.displayName = 'EnergyMessage';

// Holographic Input Component
const HolographicInput = React.memo(({ 
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
}: {
  contact: Contact;
  messages: Message[];
  onClose: () => void;
  newMessage: string;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) => {
  const tagStyle = contact.tag ? tagGradients[contact.tag] : tagGradients.cliente;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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
        className="fixed inset-0 z-[59] bg-black/40 backdrop-blur-sm"
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
        <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl" />
      
      {/* Borda gradiente */}
      <div 
        className="absolute inset-0 rounded-3xl"
        style={{
          background: `linear-gradient(135deg, ${tagStyle.from}20, ${tagStyle.to}20)`,
          padding: 1,
        }}
      />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 border-b border-foreground/10">
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
            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
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
            <p className="text-sm text-muted-foreground">
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
          className="rounded-full hover:bg-foreground/10"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Área de mensagens */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        {/* Linhas de conexão animadas */}
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
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
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
  onOpenMessenger
}: { 
  contacts: Contact[];
  onContactSelect: (contact: Contact) => void;
  isVisible: boolean;
  onToggle: () => void;
  onOpenMessenger: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const VISIBLE_COUNT = 6;
  const containerRef = useRef<HTMLDivElement>(null);
  
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
            {/* Glow effect */}
            <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-orange-500/30 via-violet-500/30 to-cyan-500/30 blur-2xl scale-110 pointer-events-none" />
            
            {/* Island container - Compact */}
            <div 
              ref={containerRef}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-full 
                         bg-black/70 backdrop-blur-2xl border border-white/10 shadow-2xl pointer-events-auto"
            >
              {/* Left arrow */}
              <motion.button
                onClick={scrollLeft}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  canScrollLeft 
                    ? "bg-white/10 hover:bg-white/20 text-white" 
                    : "text-white/20 cursor-not-allowed"
                )}
                whileHover={canScrollLeft ? { scale: 1.1 } : {}}
                whileTap={canScrollLeft ? { scale: 0.9 } : {}}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="w-3 h-3" />
              </motion.button>

              {/* Orbs - Compact */}
              <div className="flex items-center gap-2 px-1">
                {visibleContacts.map((contact, index) => {
                  const tagStyle = tagGradients[contact.tag];
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
                      
                      {/* Unread badge - smaller */}
                      {contact.unread && contact.unread > 0 && (
                        <motion.div
                          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white
                                     flex items-center justify-center text-[9px] font-bold shadow-lg"
                          style={{ color: tagStyle.from }}
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
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

              {/* Right arrow */}
              <motion.button
                onClick={scrollRight}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  canScrollRight 
                    ? "bg-white/10 hover:bg-white/20 text-white" 
                    : "text-white/20 cursor-not-allowed"
                )}
                whileHover={canScrollRight ? { scale: 1.1 } : {}}
                whileTap={canScrollRight ? { scale: 0.9 } : {}}
                disabled={!canScrollRight}
              >
                <ChevronRight className="w-3 h-3" />
              </motion.button>

              {/* Separator */}
              <div className="w-px h-6 bg-white/10 mx-0.5" />

              {/* Open full messenger */}
              <motion.button
                onClick={onOpenMessenger}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 
                           flex items-center justify-center text-white/60 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Abrir Messenger"
              >
                <Sparkles className="w-3 h-3" />
              </motion.button>

              {/* Close island */}
              <motion.button
                onClick={onToggle}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 
                           flex items-center justify-center text-white/60 hover:text-red-400 transition-colors"
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  if (!shouldShow) return null;

  return (
    <>
      <FloatingIsland
        contacts={mockContacts}
        onContactSelect={handleContactSelect}
        isVisible={isIslandVisible}
        onToggle={handleToggleIsland}
        onOpenMessenger={handleOpenMessenger}
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
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingMessengerOrbs;
