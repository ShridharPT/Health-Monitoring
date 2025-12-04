import { supabase } from '../lib/supabase.js';
import { broadcastNotification } from '../websocket/index.js';

interface CreateNotificationParams {
  patient_id?: string;
  staff_id?: string;
  sender_id?: string;
  type: 'alert' | 'prescription' | 'chat' | 'assignment' | 'device' | 'system' | 'escalation';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      patient_id: params.patient_id,
      staff_id: params.staff_id,
      sender_id: params.sender_id,
      type: params.type,
      priority: params.priority,
      title: params.title,
      message: params.message,
      data: params.data || {}
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
  
  // Broadcast via WebSocket
  if (params.staff_id) {
    broadcastNotification(params.staff_id, notification);
  }
  
  // Schedule escalation for urgent notifications
  if (params.priority === 'urgent' || params.priority === 'high') {
    scheduleEscalation(notification.id, params.staff_id, params.patient_id);
  }
  
  return notification;
}

async function scheduleEscalation(notificationId: string, staffId?: string, patientId?: string) {
  // In production, use a job queue like Bull or Agenda
  // For demo, use setTimeout
  const escalationDelay = 5 * 60 * 1000; // 5 minutes
  
  setTimeout(async () => {
    // Check if notification was acknowledged
    const { data: notification } = await supabase
      .from('notifications')
      .select('acknowledged, escalated')
      .eq('id', notificationId)
      .single();
    
    if (notification && !notification.acknowledged && !notification.escalated) {
      // Escalate to supervisor
      await escalateNotification(notificationId, staffId, patientId);
    }
  }, escalationDelay);
}

async function escalateNotification(notificationId: string, staffId?: string, patientId?: string) {
  // Get the original notification
  const { data: original } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();
  
  if (!original) return;
  
  // Find supervisor (admin or senior doctor)
  const { data: supervisors } = await supabase
    .from('staff')
    .select('id')
    .eq('role', 'admin')
    .eq('on_duty', true)
    .limit(1);
  
  const supervisorId = supervisors?.[0]?.id;
  
  if (supervisorId) {
    // Mark original as escalated
    await supabase
      .from('notifications')
      .update({ escalated: true, escalated_to: supervisorId })
      .eq('id', notificationId);
    
    // Create escalation notification
    await createNotification({
      patient_id: patientId,
      staff_id: supervisorId,
      type: 'escalation',
      priority: 'urgent',
      title: `Escalated: ${original.title}`,
      message: `Unacknowledged alert escalated: ${original.message}`,
      data: { original_notification_id: notificationId, original_staff_id: staffId }
    });
  }
}

export async function acknowledgeNotification(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', notificationId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_status: true })
    .eq('id', notificationId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUnreadNotifications(staffId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      patient:patients(id, name, room_no),
      sender:staff!notifications_sender_id_fkey(id, name, role)
    `)
    .eq('staff_id', staffId)
    .eq('read_status', false)
    .order('timestamp', { ascending: false });
  
  if (error) throw error;
  return data;
}
