import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  X,
  Send,
  Search,
  User,
  ArrowLeft,
  Check,
  CheckCheck,
  Sparkles,
  Video,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useChatContacts, useChatMessages, type ChatContact } from '@/hooks/useChat'
import { useUiStore } from '@/store/ui'
import { cn } from '@/lib/utils'

export function PrivateChatWidget() {
  const { user: currentUser } = useAuth()
  const { isChatOpen, activeChatPartnerId, openChat, closeChat, startVideoCall } = useUiStore()
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { contacts, totalUnreadCount, isLoading: loadingContacts } = useChatContacts(isChatOpen)
  const { messages, sendMessage, markRead } = useChatMessages(activeContact?.id || null)

  // Sync activeChatPartnerId from global uiStore to activeContact
  useEffect(() => {
    if (activeChatPartnerId && contacts.length > 0) {
      const found = contacts.find((c) => c.id === activeChatPartnerId)
      if (found) setActiveContact(found)
    }
  }, [activeChatPartnerId, contacts])

  // Mark as read when activeContact changes or new messages arrive
  useEffect(() => {
    if (activeContact && isChatOpen) {
      markRead.mutate(activeContact.id)
    }
  }, [activeContact?.id, messages.length, isChatOpen])

  // Scroll to bottom smoothly when messages update
  useEffect(() => {
    if (activeContact) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, activeContact?.id])

  if (!currentUser) return null

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.division?.name && c.division.name.toLowerCase().includes(q))
    )
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !activeContact) return

    const content = messageInput.trim()
    setMessageInput('')

    sendMessage.mutate(
      { receiverId: activeContact.id, content },
      {
        onSuccess: () => {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 50)
        },
      }
    )
  }

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    division_admin: 'Admin Divisi',
    agent: 'Agent',
    requester: 'Pemohon',
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none pointer-events-none">
      <AnimatePresence mode="wait">
        {!isChatOpen ? (
          /* Floating Toggle Button */
          <motion.button
            key="chat-toggle-button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => openChat()}
            className="pointer-events-auto absolute bottom-0 right-0 flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 text-white rounded-full shadow-[0_10px_25px_-5px_rgba(15,23,42,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(15,23,42,0.5)] border border-slate-700/50 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-6 h-6 text-slate-100" />

            {totalUnreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-md ring-2 ring-white"
              >
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </motion.span>
            )}
          </motion.button>
        ) : (
          /* Floating Chat Panel */
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{ transformOrigin: 'bottom right' }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="pointer-events-auto absolute bottom-0 right-0 flex flex-col w-[360px] sm:w-[420px] h-[600px] bg-white rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)] border border-slate-200/90 overflow-hidden backdrop-blur-2xl"
          >
            {/* Header with Liquid Gradient */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white shrink-0 shadow-md">
              {activeContact ? (
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveContact(null)}
                    className="p-1.5 rounded-full hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </motion.button>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-emerald-400 border border-slate-600/50 flex items-center justify-center font-bold text-sm shadow-inner">
                        {activeContact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                    </div>

                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-sm text-slate-100 truncate max-w-[170px]">
                        {activeContact.name}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {roleLabels[activeContact.role] || activeContact.role}
                        {activeContact.division?.code ? ` • ${activeContact.division.code}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-2xl bg-slate-800/90 border border-slate-700/60 text-emerald-400 shadow-inner">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      Chat Private
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </h3>
                    <p className="text-[11px] text-slate-400">Pesan instan antar staf & agent</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1">
                {activeContact && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      startVideoCall({
                        roomId: `MyHelpDesk-PrivateCall-${activeContact.name}`,
                        roomTitle: `Video Call Direct — ${activeContact.name}`,
                      })
                    }
                    className="p-1.5 rounded-full hover:bg-slate-800/80 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    title="Mulai Direct Video Call"
                  >
                    <Video className="w-5 h-5" />
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => closeChat()}
                  className="p-1.5 rounded-full hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Tutup Chat"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* View Switcher with Animated Slide */}
            <div className="relative flex-1 min-h-0 bg-slate-50/80 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {!activeContact ? (
                  /* Contacts List View */
                  <motion.div
                    key="contacts-list"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="flex flex-col h-full"
                  >
                    {/* Search Bar */}
                    <div className="p-3 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama, email, atau divisi..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-100/90 border border-slate-200/50 rounded-2xl focus:bg-white focus:border-slate-400 focus:outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {loadingContacts ? (
                        <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                          Memuat daftar kontak...
                        </div>
                      ) : filteredContacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-52 text-slate-400 p-4 text-center">
                          <User className="w-10 h-10 mb-2 stroke-1 opacity-40" />
                          <p className="text-xs font-semibold text-slate-600">Kontak tidak ditemukan</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Coba kata kunci pencarian yang lain
                          </p>
                        </div>
                      ) : (
                        filteredContacts.map((contact) => (
                          <motion.button
                            layout
                            key={contact.id}
                            whileHover={{ scale: 1.01, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveContact(contact)}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer',
                              'bg-white hover:shadow-md border border-slate-200/60 hover:border-slate-300/80',
                              contact.unreadCount > 0 &&
                                'bg-gradient-to-r from-emerald-50/90 to-white border-emerald-200 shadow-sm'
                            )}
                          >
                            <div className="relative shrink-0">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center font-bold text-sm shadow-sm">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                              {contact.unreadCount > 0 && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                                >
                                  {contact.unreadCount}
                                </motion.span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="font-semibold text-xs text-slate-900 truncate">
                                  {contact.name}
                                </span>
                                {contact.lastMessage && (
                                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                    {new Date(contact.lastMessage.createdAt).toLocaleTimeString(
                                      [],
                                      {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-[10px] font-medium text-slate-700">
                                  {roleLabels[contact.role] || contact.role}
                                </span>
                                {contact.division && (
                                  <span className="text-[10px] text-slate-400 font-medium truncate">
                                    {contact.division.code}
                                  </span>
                                )}
                              </div>

                              {contact.lastMessage && (
                                <p className="text-[11px] text-slate-500 truncate">
                                  {contact.lastMessage.senderId === currentUser.id ? 'Anda: ' : ''}
                                  {contact.lastMessage.content}
                                </p>
                              )}
                            </div>
                          </motion.button>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* Chat Room View */
                  <motion.div
                    key="chat-room"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="flex flex-col h-full"
                  >
                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center mb-3">
                            <MessageSquare className="w-6 h-6 text-slate-400 stroke-1" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">Belum ada percakapan</p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                            Mulai obrolan privat secara langsung dengan {activeContact.name}
                          </p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMe = msg.senderId === currentUser.id
                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                              key={msg.id}
                              className={cn(
                                'flex flex-col max-w-[82%]',
                                isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                              )}
                            >
                              <div
                                className={cn(
                                  'px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm',
                                  isMe
                                    ? 'bg-slate-900 text-white rounded-br-xs shadow-slate-900/10'
                                    : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs'
                                )}
                              >
                                {msg.content}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 px-1">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {isMe && (
                                  msg.isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-slate-400" />
                                  )
                                )}
                              </div>
                            </motion.div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input Bar */}
                    <form
                      onSubmit={handleSendMessage}
                      className="p-3 bg-white/90 backdrop-blur-md border-t border-slate-200/80 flex items-center gap-2 shrink-0"
                    >
                      <input
                        type="text"
                        placeholder="Tulis pesan privat..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-xs bg-slate-100/90 border border-slate-200/60 rounded-full focus:bg-white focus:border-slate-400 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        type="submit"
                        disabled={!messageInput.trim() || sendMessage.isPending}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 text-white disabled:opacity-30 hover:bg-slate-800 transition-colors shrink-0 shadow-md cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
