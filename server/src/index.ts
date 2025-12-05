import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { vitalsRouter } from './routes/vitals.js';
import { patientsRouter } from './routes/patients.js';
import { staffRouter } from './routes/staff.js';
import { assignmentsRouter } from './routes/assignments.js';
import { prescriptionsRouter } from './routes/prescriptions.js';
import { medicinesRouter } from './routes/medicines.js';
import { devicesRouter } from './routes/devices.js';
import { reportsRouter } from './routes/reports.js';
import { authRouter } from './routes/auth.js';
import { aiRouter } from './routes/ai.js';
import { setupWebSocket } from './websocket/index.js';
import { setupRealtimeSubscriptions } from './realtime/subscriptions.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'vitalguard-api' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/vitals', vitalsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/medicines', medicinesRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/ai', aiRouter);

// WebSocket setup
setupWebSocket(wss);

// Realtime subscriptions
setupRealtimeSubscriptions(wss);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

export { wss };
