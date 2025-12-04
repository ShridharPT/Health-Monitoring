import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type MessageHandler = (data: any) => void;

interface UseWebSocketOptions {
  onVitals?: MessageHandler;
  onPrediction?: MessageHandler;
  onForecast?: MessageHandler;
  onNotification?: MessageHandler;
  onChat?: MessageHandler;
  onDeviceStatus?: MessageHandler;
  onRiskEvent?: MessageHandler;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user, token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const subscribedPatientsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Authenticate
      if (user && token) {
        ws.send(JSON.stringify({
          type: 'auth',
          staffId: user.id,
          role: user.role
        }));
      }

      // Resubscribe to patients
      for (const patientId of subscribedPatientsRef.current) {
        ws.send(JSON.stringify({
          type: 'subscribe_patient',
          patientId
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'vitals':
            options.onVitals?.(data.payload);
            break;
          case 'prediction':
            options.onPrediction?.(data.payload);
            break;
          case 'forecast':
            options.onForecast?.(data.payload);
            break;
          case 'notification':
            options.onNotification?.(data.payload);
            break;
          case 'chat':
            options.onChat?.(data.payload);
            break;
          case 'device_status':
            options.onDeviceStatus?.(data.payload);
            break;
          case 'risk_event':
            options.onRiskEvent?.(data.payload);
            break;
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [user, token, options]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribeToPatient = useCallback((patientId: string) => {
    subscribedPatientsRef.current.add(patientId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_patient',
        patientId
      }));
    }
  }, []);

  const unsubscribeFromPatient = useCallback((patientId: string) => {
    subscribedPatientsRef.current.delete(patientId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_patient',
        patientId
      }));
    }
  }, []);

  const sendChatMessage = useCallback((receiverId: string, content: string, patientId?: string, isUrgent = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        receiverId,
        patientId,
        content,
        isUrgent
      }));
    }
  }, []);

  return {
    isConnected,
    subscribeToPatient,
    unsubscribeFromPatient,
    sendChatMessage
  };
}
