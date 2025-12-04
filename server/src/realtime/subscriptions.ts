import { WebSocketServer } from 'ws';
import { supabase } from '../lib/supabase.js';
import { broadcastToPatientSubscribers, broadcastToAll, broadcastNotification } from '../websocket/index.js';

export function setupRealtimeSubscriptions(wss: WebSocketServer) {
  // Subscribe to vitals changes
  supabase
    .channel('vitals-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vitals' }, (payload) => {
      broadcastToPatientSubscribers(payload.new.patient_id, {
        type: 'vitals',
        payload: payload.new,
        timestamp: new Date().toISOString()
      });
    })
    .subscribe();
  
  // Subscribe to predictions changes
  supabase
    .channel('predictions-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'predictions' }, (payload) => {
      broadcastToPatientSubscribers(payload.new.patient_id, {
        type: 'prediction',
        payload: payload.new,
        timestamp: new Date().toISOString()
      });
    })
    .subscribe();
  
  // Subscribe to forecasts changes
  supabase
    .channel('forecasts-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forecasts' }, (payload) => {
      broadcastToPatientSubscribers(payload.new.patient_id, {
        type: 'forecast',
        payload: payload.new,
        timestamp: new Date().toISOString()
      });
    })
    .subscribe();
  
  // Subscribe to notifications
  supabase
    .channel('notifications-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
      if (payload.new.staff_id) {
        broadcastNotification(payload.new.staff_id, payload.new);
      }
    })
    .subscribe();
  
  // Subscribe to prescription changes
  supabase
    .channel('prescriptions-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, (payload) => {
      const prescription = payload.new as any;
      broadcastToPatientSubscribers(prescription.patient_id, {
        type: 'prescription',
        event: payload.eventType,
        payload: prescription,
        timestamp: new Date().toISOString()
      });
    })
    .subscribe();
  
  // Subscribe to chat messages
  supabase
    .channel('chat-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
      const message = payload.new as any;
      broadcastNotification(message.receiver_id, {
        type: 'chat',
        payload: message
      });
    })
    .subscribe();
  
  // Subscribe to device status changes
  supabase
    .channel('devices-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'iot_devices' }, (payload) => {
      broadcastToAll({
        type: 'device_status',
        payload: payload.new,
        timestamp: new Date().toISOString()
      });
    })
    .subscribe();
  
  // Subscribe to risk events
  supabase
    .channel('risk-events-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'risk_events' }, (payload) => {
      broadcastToPatientSubscribers(payload.new.patient_id, {
        type: 'risk_event',
        payload: payload.new,
        timestamp: new Date().toISOString()
      });
    })
    .subscribe();
  
  console.log('Realtime subscriptions initialized');
}
