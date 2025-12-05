# VitalGuard AI - Hospital-Grade Patient Monitoring Platform

A comprehensive hospital-grade patient monitoring platform with AI-powered risk prediction, real-time vitals monitoring, prescription management, and multi-role dashboards.

## Features

### Core Functionality
- **Real-time Vitals Monitoring**: Track heart rate, SpO₂, respiratory rate, blood pressure, and temperature
- **AI Risk Prediction**: Machine learning-based patient deterioration detection with SHAP explanations
- **Vitals Forecasting**: Predict patient vitals for the next 5-30 minutes
- **Multi-Role Dashboards**: Separate interfaces for Admin, Doctor, Nurse, and Patient roles

### Clinical Features
- **Prescription System**: Voice-based and manual prescription creation with drug interaction warnings
- **Real-time Chat**: Secure doctor-nurse messaging with urgent flags
- **PDF Reports**: Auto-generated patient summary reports
- **Alert System**: Real-time notifications with escalation logic

### IoT Integration
- **Device Management**: Register and monitor medical IoT devices
- **Device Health Monitoring**: Track online/offline status, battery levels
- **MQTT/WebSocket Ingestion**: Real-time data streaming from devices

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- TanStack Query
- Recharts
- React Router

### Backend
- Node.js + Express
- WebSocket (ws)
- JWT Authentication
- PDFKit for report generation

### Database
- Supabase (PostgreSQL)
- Real-time subscriptions

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd vitalguard-ai
```

2. Install frontend dependencies
```bash
npm install
```

3. Install backend dependencies
```bash
cd server
npm install
cd ..
```

4. Configure environment variables
```bash
# .env (frontend)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# server/.env (backend)
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret
```

5. Run database migrations
```bash
# Apply migrations via Supabase dashboard or CLI
supabase db push
```

6. Start the development servers
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd server
npm run dev
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | admin123 |
| Doctor | doctor@hospital.com | doctor123 |
| Nurse | nurse@hospital.com | nurse123 |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - List patients
- `POST /api/patients` - Create patient
- `GET /api/patients/:id` - Get patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Vitals
- `POST /api/vitals` - Record vitals
- `GET /api/vitals/:patient_id` - Get patient vitals

### AI
- `POST /api/ai/predict` - Run prediction
- `GET /api/ai/risk/:patient_id` - Get risk assessment
- `GET /api/ai/forecast/:patient_id` - Get forecast
- `POST /api/ai/voice-to-text` - Voice transcription
- `POST /api/ai/parse-medicine` - Parse prescription text

### Prescriptions
- `GET /api/prescriptions` - List prescriptions
- `POST /api/prescriptions` - Create prescription
- `PATCH /api/prescriptions/:id/status` - Update status

### Reports
- `GET /api/reports/patient/:id/pdf` - Generate PDF report

### WebSocket
- `/ws/vitals` - Real-time vitals stream
- `/ws/notifications` - Immediate alerts
- `/ws/chat` - Doctor-nurse messaging

## Deployment on Render

### Option 1: Using render.yaml (Blueprint)

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render will detect `render.yaml` and create both services
6. Add environment variables in Render dashboard:

**Backend (vitalguard-api):**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `JWT_SECRET`: Auto-generated or set your own

**Frontend (vitalguard-frontend):**
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon key
- `VITE_API_URL`: Your backend URL (e.g., https://vitalguard-api.onrender.com/api)
- `VITE_WS_URL`: Your backend WebSocket URL (e.g., wss://vitalguard-api.onrender.com)

### Option 2: Manual Deployment

**Deploy Backend:**
1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Set Root Directory: `server`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Add environment variables

**Deploy Frontend:**
1. Create a new Static Site on Render
2. Connect your GitHub repo
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Add environment variables
6. Add rewrite rule: `/*` → `/index.html`

## Docker Deployment

```bash
docker-compose up -d
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Express API    │────▶│    Supabase     │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   WebSocket     │     │   AI Engine     │
│   (Real-time)   │     │  (Prediction)   │
└─────────────────┘     └─────────────────┘
```

## License

MIT
