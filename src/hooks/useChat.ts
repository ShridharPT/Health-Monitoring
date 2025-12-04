import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as store from '@/lib/localStore';
import type { ChatMessage } from '@/types/hospital';

function enrichChatMessage(m: ChatMessage): ChatMessage {
  return {
    ...m,
    sender: store.getStaffById(m.sender_id),
    receiver: store.getStaffById(m.receiver_id)
  };
}

export function useChatMessages(userId?: string, otherUserId?: string, patientId?: string) {
  return useQuery({
    queryKey: ['chat-messages', userId, otherUserId, patientId],
    queryFn: async () => {
      if (!userId || !otherUserId) return [];
      
      try {
        let query = supabase
          .from('chat_messages')
          .select(`
            *,
            sender:staff!chat_messages_sender_id_fkey(id, name, role, avatar_url),
            receiver:staff!chat_messages_receiver_id_fkey(id, name, role, avatar_url)
          `)
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);
        
        if (patientId) {
          query = query.eq('patient_id', patientId);
        }
        
        const { data, error } = await query
          .order('timestamp', { ascending: true })
          .limit(100);
        
        if (error) throw error;
        if (data && data.length > 0) return data as ChatMessage[];
      } catch {
        console.log('Using local storage for chat messages');
      }
      
      let messages = store.getChatMessages(userId).filter(m => 
        (m.sender_id === userId && m.receiver_id === otherUserId) ||
        (m.sender_id === otherUserId && m.receiver_id === userId)
      );
      if (patientId) messages = messages.filter(m => m.patient_id === patientId);
      return messages.map(enrichChatMessage);
    },
    enabled: !!userId && !!otherUserId,
    refetchInterval: 5000
  });
}

export function useChatConversations(userId?: string) {
  return useQuery({
    queryKey: ['chat-conversations', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            sender:staff!chat_messages_sender_id_fkey(id, name, role, avatar_url),
            receiver:staff!chat_messages_receiver_id_fkey(id, name, role, avatar_url),
            patient:patients(id, name, room_no)
          `)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const conversations = new Map<string, ChatMessage>();
          for (const msg of data) {
            const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
            if (!conversations.has(partnerId)) {
              conversations.set(partnerId, msg as ChatMessage);
            }
          }
          return Array.from(conversations.values());
        }
      } catch {
        console.log('Using local storage for chat conversations');
      }
      
      const messages = store.getChatMessages(userId);
      const conversations = new Map<string, ChatMessage>();
      for (const msg of messages) {
        const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, enrichChatMessage(msg));
        }
      }
      return Array.from(conversations.values());
    },
    enabled: !!userId
  });
}


export function useSendChatMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (message: {
      sender_id: string;
      receiver_id: string;
      patient_id?: string;
      message: string;
      message_type?: string;
      is_urgent?: boolean;
      reference_id?: string;
    }) => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            ...message,
            message_type: message.message_type || 'text',
            is_urgent: message.is_urgent || false
          })
          .select(`
            *,
            sender:staff!chat_messages_sender_id_fkey(id, name, role),
            receiver:staff!chat_messages_receiver_id_fkey(id, name, role)
          `)
          .single();
        
        if (error) throw error;
        return data as ChatMessage;
      } catch {
        console.log('Using local storage for send chat message');
        const newMessage = store.createChatMessage({
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          patient_id: message.patient_id,
          message: message.message,
          message_type: (message.message_type || 'text') as ChatMessage['message_type'],
          is_urgent: message.is_urgent || false,
          reference_id: message.reference_id,
        });
        return enrichChatMessage(newMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    }
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('id', messageId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for mark message read');
        const updated = store.markChatMessageRead(messageId);
        return updated || { id: messageId, read_at: new Date().toISOString() };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    }
  });
}

export function useMarkAllMessagesRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('receiver_id', userId)
          .is('read_at', null)
          .select();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for mark all messages read');
        return store.markAllChatMessagesRead(userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    }
  });
}

export function useUnreadMessageCount(userId?: string) {
  return useQuery({
    queryKey: ['unread-messages', userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      try {
        const { count, error } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', userId)
          .is('read_at', null);
        
        if (error) throw error;
        if (count !== null) return count;
      } catch {
        console.log('Using local storage for unread message count');
      }
      
      return store.getChatMessages(userId).filter(m => m.receiver_id === userId && !m.read_at).length;
    },
    enabled: !!userId,
    refetchInterval: 10000
  });
}

export function useRealtimeChat(userId?: string, otherUserId?: string) {
  const queryClient = useQueryClient();
  
  if (userId && otherUserId) {
    supabase
      .channel(`chat-${userId}-${otherUserId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages'
      }, (payload) => {
        const msg = payload.new as { sender_id: string; receiver_id: string };
        if ((msg.sender_id === userId && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === userId)) {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', userId, otherUserId] });
        }
      })
      .subscribe();
  }
}
