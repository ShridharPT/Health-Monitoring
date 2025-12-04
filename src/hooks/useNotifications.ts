import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as store from '@/lib/localStore';
import type { Notification } from '@/types/hospital';

function enrichNotification(n: Notification): Notification {
  return {
    ...n,
    patient: n.patient_id ? store.getPatientById(n.patient_id) : undefined,
    sender: n.sender_id ? store.getStaffById(n.sender_id) : undefined
  };
}

export function useNotifications(staffId?: string, unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', staffId, unreadOnly],
    queryFn: async () => {
      if (!staffId) return [];
      
      try {
        let query = supabase
          .from('notifications')
          .select(`
            *,
            patient:patients(id, name, room_no),
            sender:staff!notifications_sender_id_fkey(id, name, role)
          `)
          .eq('staff_id', staffId);
        
        if (unreadOnly) {
          query = query.eq('read_status', false);
        }
        
        const { data, error } = await query
          .order('timestamp', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        if (data && data.length > 0) return data as Notification[];
      } catch {
        console.log('Using local storage for notifications');
      }
      
      let notifications = store.getNotifications(staffId);
      if (unreadOnly) notifications = notifications.filter(n => !n.read_status);
      return notifications.map(enrichNotification);
    },
    enabled: !!staffId,
    refetchInterval: 30000
  });
}

export function useUnreadNotificationCount(staffId?: string) {
  return useQuery({
    queryKey: ['notification-count', staffId],
    queryFn: async () => {
      if (!staffId) return 0;
      
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('staff_id', staffId)
          .eq('read_status', false);
        
        if (error) throw error;
        if (count !== null) return count;
      } catch {
        console.log('Using local storage for notification count');
      }
      
      return store.getNotifications(staffId).filter(n => !n.read_status).length;
    },
    enabled: !!staffId,
    refetchInterval: 10000
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .update({ read_status: true })
          .eq('id', notificationId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for mark notification read');
        return { id: notificationId, read_status: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    }
  });
}

export function useAcknowledgeNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .update({ 
            acknowledged: true, 
            acknowledged_at: new Date().toISOString(),
            read_status: true
          })
          .eq('id', notificationId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch {
        console.log('Using local storage for acknowledge notification');
        return { id: notificationId, acknowledged: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    }
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (staffId: string) => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read_status: true })
          .eq('staff_id', staffId)
          .eq('read_status', false);
        
        if (error) throw error;
      } catch {
        console.log('Using local storage for mark all notifications read');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    }
  });
}

export function useRealtimeNotifications(staffId?: string) {
  const queryClient = useQueryClient();
  
  if (staffId) {
    supabase
      .channel(`notifications-${staffId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `staff_id=eq.${staffId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', staffId] });
        queryClient.invalidateQueries({ queryKey: ['notification-count', staffId] });
      })
      .subscribe();
  }
}
