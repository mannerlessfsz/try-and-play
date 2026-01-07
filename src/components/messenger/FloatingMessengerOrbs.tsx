import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Mic, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresaAtiva } from '@/hooks/useEmpresaAtiva';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
interface Contact {
  id: string;
  name: string;
  avatar?: string;
  tag: 'cliente' | 'fornecedor' | 'interno';
  online?: boolean;
  unread?: number;
  lastMessage?: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'them';
  timestamp: Date;
}

// Mock data - replace with real data from Supabase
const mockContacts: Contact[] = [
  { id: '1', name: 'João Silva', tag: 'cliente', online: true, unread: 3, lastMessage: 'Preciso do relatório' },
  { id: '2', name: 'Maria Santos', tag: 'fornecedor', online: false, unread: 1, lastMessage: 'NF enviada' },
  { id: '3', name: 'Carlos Equipe', tag: 'interno', online: true, unread: 0, lastMessage: 'Reunião às 15h' },
];

const mockMessages: Message[] = [
  { id: '1', content: 'Olá, como posso ajudar?', sender: 'them', timestamp: new Date() },
  { id: '2', content: 'Preciso do relatório financeiro', sender: 'them', timestamp: new Date() },
];

// Tag colors
const tagColors = {
  cliente: {
    primary: 'from-orange-500 to-amber-400',
    glow: 'shadow-orange-500/50',
    ring: 'border-orange-400',
    bg: 'bg-orange-500/20',
  },
  fornecedor: {
    primary: 'from-violet-500 to-purple-400',
    glow: 'shadow-violet-500/50',
    ring: 'border-violet-400',
    bg: 'bg-violet-500/20',
  },
  interno: {
    primary: 'from-cyan-500 to-blue-400',
    glow: 'shadow-cyan-500/50',
    ring: 'border-cyan-400',
    bg: 'bg-cyan-500/20',
  },
};

// Orbital Constellation Component
const OrbitalConstellation = React.memo(({ 
  contacts, 
  isExpanded, 
  onOrbClick,
  onToggle 
}: { 
  contacts: Contact[];
  isExpanded: boolean;
  onOrbClick: (contact: Contact) => void;
  onToggle: () => void;
}) => {
  const contactsWithUnread = contacts.filter(c => c.unread && c.unread > 0);
  const totalUnread = contactsWithUnread.reduce((acc, c) => acc + (c.unread || 0), 0);

  return (
    <motion.div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      {/* Main Portal Button */}
      <motion.button
        onClick={onToggle}
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/30 to-violet-500/30 
                   backdrop-blur-xl border border-white/20 shadow-2xl
                   flex items-center justify-center group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Rotating rings */}
        <motion.div
          className="absolute inset-0 rounded-full border border-orange-400/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-[-4px] rounded-full border border-violet-400/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Core icon */}
        <MessageCircle className="w-6 h-6 text-white/80" />
        
        {/* Unread badge */}
        {totalUnread > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500
                       flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-red-500/50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            {totalUnread}
          </motion.div>
        )}

        {/* Pulse effect when has unread */}
        {totalUnread > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-orange-500/30"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Expanded Orbs */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute right-16 top-1/2 -translate-y-1/2 flex flex-col gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {contactsWithUnread.map((contact, index) => (
              <motion.button
                key={contact.id}
                onClick={() => onOrbClick(contact)}
                className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${tagColors[contact.tag].primary}
                           backdrop-blur-xl border border-white/30 shadow-lg ${tagColors[contact.tag].glow}
                           flex items-center justify-center group overflow-hidden`}
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, x: 20 }}
                transition={{ delay: index * 0.05, type: 'spring', bounce: 0.4 }}
                whileHover={{ scale: 1.15, x: -10 }}
              >
                {/* Avatar or initials */}
                <span className="text-sm font-bold text-white">
                  {contact.name.charAt(0)}
                </span>
                
                {/* Unread count */}
                {contact.unread && contact.unread > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white
                                  flex items-center justify-center text-[9px] font-bold text-gray-900">
                    {contact.unread}
                  </div>
                )}

                {/* Online indicator */}
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 
                                  border-2 border-black/50" />
                )}

                {/* Hover tooltip */}
                <motion.div
                  className="absolute right-full mr-2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-xl
                             border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100
                             pointer-events-none"
                  initial={{ x: 10 }}
                  whileHover={{ x: 0 }}
                >
                  <p className="text-xs font-medium text-white">{contact.name}</p>
                  <p className="text-[10px] text-white/60 truncate max-w-32">{contact.lastMessage}</p>
                </motion.div>

                {/* Rotating energy ring */}
                <motion.div
                  className="absolute inset-[-2px] rounded-full border border-white/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
              </motion.button>
            ))}

            {/* "View all" button */}
            <motion.button
              className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/10
                         flex items-center justify-center text-white/40 hover:text-white/80
                         hover:bg-white/10 transition-colors"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ delay: contactsWithUnread.length * 0.05 }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

OrbitalConstellation.displayName = 'OrbitalConstellation';

// Quick Chat Modal
const QuickChatModal = React.memo(({ 
  contact, 
  messages,
  onClose,
  onSend,
  onOpenFull
}: { 
  contact: Contact;
  messages: Message[];
  onClose: () => void;
  onSend: (message: string) => void;
  onOpenFull: () => void;
}) => {
  const [inputValue, setInputValue] = useState('');
  const colors = tagColors[contact.tag];

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      onSend(inputValue);
      setInputValue('');
    }
  }, [inputValue, onSend]);

  return (
    <motion.div
      className="fixed right-20 top-1/2 -translate-y-1/2 z-50 w-80"
      initial={{ opacity: 0, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 20 }}
    >
      {/* Glassmorphic container */}
      <div className="rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 
                      shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`p-4 bg-gradient-to-r ${colors.primary} bg-opacity-20 
                        border-b border-white/10 flex items-center gap-3`}>
          {/* Contact orb */}
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors.primary}
                          flex items-center justify-center shadow-lg ${colors.glow}`}>
            <span className="text-sm font-bold text-white">{contact.name.charAt(0)}</span>
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-white">{contact.name}</p>
            <p className="text-xs text-white/60 capitalize">{contact.tag}</p>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={onOpenFull}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="h-64 p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={`max-w-[80%] px-3 py-2 rounded-xl ${
                  msg.sender === 'me'
                    ? `bg-gradient-to-br ${colors.primary} text-white`
                    : 'bg-white/10 text-white/90'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-white/10 flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40
                       focus:border-white/30 focus:ring-0"
          />
          <Button
            size="icon"
            className={`bg-gradient-to-br ${colors.primary} hover:opacity-90`}
            onClick={handleSend}
          >
            {inputValue ? <Send className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Decorative particles */}
      <motion.div
        className={`absolute -z-10 w-32 h-32 rounded-full bg-gradient-to-br ${colors.primary} 
                    opacity-20 blur-3xl -top-10 -right-10`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </motion.div>
  );
});

QuickChatModal.displayName = 'QuickChatModal';

// Main Component
export const FloatingMessengerOrbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { empresaAtiva } = useEmpresaAtiva();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Don't show on messenger page, auth pages, or landing
  const hiddenRoutes = ['/messenger', '/auth', '/master', '/'];
  const shouldShow = useMemo(() => {
    return user && !hiddenRoutes.includes(location.pathname);
  }, [user, location.pathname]);

  const handleOrbClick = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setIsExpanded(false);
  }, []);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
    if (selectedContact) setSelectedContact(null);
  }, [selectedContact]);

  const handleSendMessage = useCallback((message: string) => {
    console.log('Sending message:', message);
    // TODO: Implement actual message sending via Supabase
  }, []);

  const handleOpenFull = useCallback(() => {
    navigate('/messenger');
  }, [navigate]);

  const handleCloseChat = useCallback(() => {
    setSelectedContact(null);
  }, []);

  if (!shouldShow) return null;

  return (
    <>
      <OrbitalConstellation
        contacts={mockContacts}
        isExpanded={isExpanded}
        onOrbClick={handleOrbClick}
        onToggle={handleToggle}
      />

      <AnimatePresence>
        {selectedContact && (
          <QuickChatModal
            contact={selectedContact}
            messages={mockMessages}
            onClose={handleCloseChat}
            onSend={handleSendMessage}
            onOpenFull={handleOpenFull}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingMessengerOrbs;
