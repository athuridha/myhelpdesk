import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuth } from './useAuth'

export interface ChatContact {
  id: string
  name: string
  email: string
  role: string
  isSharedAccount: boolean
  division: {
    id: string
    name: string
    code: string
  } | null
  unreadCount: number
  lastMessage: {
    content: string
    createdAt: string
    senderId: string
  } | null
}

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: string
}

export function useChatContacts(enabled: boolean = true) {
  const query = useQuery<ChatContact[]>({
    queryKey: ['chat-contacts'],
    queryFn: () => apiFetch('/chat/contacts'),
    refetchInterval: 4000,
    enabled,
    placeholderData: (prev) => prev,
  })

  const totalUnreadCount = query.data?.reduce((acc, c) => acc + c.unreadCount, 0) ?? 0

  return {
    contacts: query.data || [],
    totalUnreadCount,
    isLoading: query.isLoading && !query.data,
    refetch: query.refetch,
  }
}

export function useChatMessages(partnerId: string | null) {
  const qc = useQueryClient()
  const { user } = useAuth()

  const query = useQuery<ChatMessage[]>({
    queryKey: ['chat-messages', partnerId],
    queryFn: () => apiFetch(`/chat/messages?partnerId=${partnerId}`),
    refetchInterval: partnerId ? 2500 : false,
    enabled: !!partnerId,
    placeholderData: (prev) => prev,
  })

  const sendMessage = useMutation({
    mutationFn: (data: { receiverId: string; content: string }) =>
      apiFetch<ChatMessage>('/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    // Optimistic Update for 0ms latency feeling
    onMutate: async ({ receiverId, content }) => {
      if (!user || !partnerId) return

      await qc.cancelQueries({ queryKey: ['chat-messages', partnerId] })

      const previousMessages = qc.getQueryData<ChatMessage[]>(['chat-messages', partnerId])

      const optimisticMsg: ChatMessage = {
        id: 'optimistic-' + Date.now(),
        senderId: user.id,
        receiverId,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
      }

      qc.setQueryData<ChatMessage[]>(['chat-messages', partnerId], (old) => [
        ...(old || []),
        optimisticMsg,
      ])

      // Also update contacts list lastMessage preview optimistically
      qc.setQueryData<ChatContact[]>(['chat-contacts'], (oldContacts) => {
        if (!oldContacts) return oldContacts
        return oldContacts.map((c) => {
          if (c.id === receiverId) {
            return {
              ...c,
              lastMessage: {
                content,
                createdAt: optimisticMsg.createdAt,
                senderId: user.id,
              },
            }
          }
          return c
        })
      })

      return { previousMessages }
    },

    onError: (_err, _variables, context) => {
      if (context?.previousMessages && partnerId) {
        qc.setQueryData(['chat-messages', partnerId], context.previousMessages)
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['chat-messages', partnerId] })
      qc.invalidateQueries({ queryKey: ['chat-contacts'] })
    },
  })

  const markRead = useMutation({
    mutationFn: (partnerIdToMark: string) =>
      apiFetch('/chat/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: partnerIdToMark }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-contacts'] })
      qc.invalidateQueries({ queryKey: ['chat-messages', partnerId] })
    },
  })

  return {
    messages: query.data || [],
    isLoading: query.isLoading && !query.data,
    sendMessage,
    markRead,
  }
}
