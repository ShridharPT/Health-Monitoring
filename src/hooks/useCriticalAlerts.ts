import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  requestNotificationPermission, 
  sendCriticalNotification,
  isPageVisible 
} from '@/lib/pushNotifications';
import { toast } from 'sonner';

export function useCriticalAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const permissionRequested = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (!permissionRequested.current && user) {
      permissionRequested.current = true;
      requestNotificationPermission().then((granted) => {
        if (granted) {
          console.log('Push notifications enabled for critical alerts');
        }
      });
    }
  }, [user]);

  // Subscribe to critical notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`critical-alerts-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `staff_id=eq.${user.id}`
      }, (payload) => {
        const notification = payload.new as any;
        
        // Check if it's a critical or high priority notification
        const isCritical = notification.type === 'critical' || 
                          notification.type === 'alert' ||
                          notification.message?.toLowerCase().includes('critical') ||
                          notification.message?.toLowerCase().includes('deteriorat');

        if (isCritical) {
          // Send browser push notification
          sendCriticalNotification({
            title: 'Critical Patient Alert',
            body: notification.message || 'A patient requires immediate attention',
            patientName: notification.patient?.name,
            roomNo: notification.patient?.room_no,
            riskLevel: 'critical',
            onClick: () => {
              if (notification.patient_id) {
                window.location.href = `/patient/${notification.patient_id}`;
              }
            }
          });

          // Also show in-app toast
          toast.error(notification.message || 'Critical Alert', {
            duration: 10000,
          });
        } else {
          // Regular notification - only show if page is not visible
          if (!isPageVisible()) {
            sendCriticalNotification({
              title: 'New Notification',
              body: notification.message || 'You have a new notification',
              riskLevel: 'medium'
            });
          }
        }

        // Refresh notifications
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      })
      .subscribe();

    // Also subscribe to risk_events for real-time critical alerts
    const riskChannel = supabase
      .channel(`risk-events-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'risk_events'
      }, async (payload) => {
        const riskEvent = payload.new as any;
        
        // Only alert for high/critical risk
        if (riskEvent.risk_level === 'critical' || riskEvent.risk_level === 'high') {
          // Check if this patient is assigned to the current user
          // @ts-ignore - Supabase type instantiation issue
          const result = await supabase.from('assignments').select('id, status').eq('patient_id', riskEvent.patient_id).eq('staff_id', user.id);
          const assignments = result.data as any[] | null;
          const isAssigned = assignments && assignments.some((a) => a.status === 'active');

          if (isAssigned || user.role === 'admin') {
            // Get patient info
            const { data: patient } = await supabase
              .from('patients')
              .select('name, room_no')
              .eq('id', riskEvent.patient_id)
              .single();

            sendCriticalNotification({
              title: `${riskEvent.risk_level.toUpperCase()} Risk Alert`,
              body: riskEvent.description || `Patient deterioration detected`,
              patientName: patient?.name,
              roomNo: patient?.room_no,
              riskLevel: riskEvent.risk_level,
              onClick: () => {
                window.location.href = `/patient/${riskEvent.patient_id}`;
              }
            });

            toast.error(`${riskEvent.risk_level.toUpperCase()}: ${patient?.name || 'Patient'} - ${riskEvent.description}`, {
              duration: 15000,
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['risk-events'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(riskChannel);
    };
  }, [user?.id, user?.role, queryClient]);
}
