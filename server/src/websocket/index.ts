import { WebSocketServer, WebSocket } from 'ws';

interface WSClient {
  ws: WebSocket;
  staffId?: string;
  subscribedPatients: Set<string>;
  role?: string;
}

const clients = new Map<WebSocket, WSClient>();
const staffConnections = new Map<string, Set<WebSocket>>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    const client: WSClient = {
      ws,
      subscribedPatients: new Set()
    };
    clients.set(ws, client);
    
    console.log('WebSocket client connected');
    
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, client, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove from staff connections
      if (client.staffId) {
        const staffWs = staffConnections.get(client.staffId);
        if (staffWs) {
          staffWs.delete(ws);
          if (staffWs.size === 0) {
            staffConnections.delete(client.staffId);
          }
        }
      }
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

function handleMessage(ws: WebSocket, client: WSClient, message: any) {
  switch (message.type) {
    case 'auth':
      // Authenticate and associate with staff
      client.staffId = message.staffId;
      client.role = message.role;
      
      if (!staffConnections.has(message.staffId)) {
        staffConnections.set(message.staffId, new Set());
      }
      staffConnections.get(message.staffId)!.add(ws);
      
      ws.send(JSON.stringify({ type: 'auth_success', staffId: message.staffId }));
      break;
      
    case 'subscribe_patient':
      client.subscribedPatients.add(message.patientId);
      ws.send(JSON.stringify({ type: 'subscribed', patientId: message.patientId }));
      break;
      
    case 'unsubscribe_patient':
      client.subscribedPatients.delete(message.patientId);
      ws.send(JSON.stringify({ type: 'unsubscribed', patientId: message.patientId }));
      break;
      
    case 'chat':
      // Forward chat message to receiver
      handleChatMessage(client, message);
      break;
      
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
}

function handleChatMessage(sender: WSClient, message: any) {
  const { receiverId, patientId, content, isUrgent } = message;
  
  const chatMessage = {
    type: 'chat',
    payload: {
      senderId: sender.staffId,
      receiverId,
      patientId,
      message: content,
      isUrgent,
      timestamp: new Date().toISOString()
    }
  };
  
  // Send to receiver
  const receiverWs = staffConnections.get(receiverId);
  if (receiverWs) {
    for (const ws of receiverWs) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(chatMessage));
      }
    }
  }
  
  // Send confirmation to sender
  sender.ws.send(JSON.stringify({
    type: 'chat_sent',
    payload: chatMessage.payload
  }));
}

export function broadcastToPatientSubscribers(patientId: string, message: any) {
  for (const [ws, client] of clients) {
    if (client.subscribedPatients.has(patientId) && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

export function broadcastNotification(staffId: string, notification: any) {
  const staffWs = staffConnections.get(staffId);
  if (staffWs) {
    const message = {
      type: 'notification',
      payload: notification,
      timestamp: new Date().toISOString()
    };
    
    for (const ws of staffWs) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}

export function broadcastDeviceStatus(device: any) {
  const message = {
    type: 'device_status',
    payload: device,
    timestamp: new Date().toISOString()
  };
  
  // Broadcast to all connected clients (admins and relevant staff)
  for (const [ws, client] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      // Send to admins or if device is assigned to a patient they're subscribed to
      if (client.role === 'admin' || 
          (device.patient_id && client.subscribedPatients.has(device.patient_id))) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}

export function broadcastToAll(message: any) {
  for (const [ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}
