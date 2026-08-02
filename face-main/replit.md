# Employee Management System

## Overview
A full-stack Employee Management System built with React (Vite) frontend and Node.js/Express backend with MongoDB database.

## Project Structure
```
├── backend/              # Express.js API server
│   ├── config/           # Database configuration
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Auth, error handling, validation
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── socket/           # Socket.IO chat handlers
│   ├── utils/            # Helper functions
│   └── server.js         # Entry point
├── frontend/             # React/Vite application
│   ├── public/           # Static assets, face recognition models
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layers
│   │   ├── utils/        # Utilities and API helpers
│   │   └── hooks/        # Custom React hooks
│   └── vite.config.js    # Vite configuration
```

## Features
- User authentication (Admin/Employee roles)
- Employee management
- Leave management system
- Attendance tracking with video-based face recognition
- Task management
- Department management
- Sales lead management
- Real-time chat (Socket.IO)
- **Group Chat** - Create groups, add/remove members, owner/admin permissions, real-time messaging
- AI chatbot integration
- Purchase order management
- **Payslip Management** - Admin can generate, bulk generate, view, and download employee payslips
- **Employee Banking Details** - Admin can view employee banking information

## Local Development Setup
See `LOCAL_SETUP.md` in the root directory for complete instructions on:
- Running the project locally
- Setting up environment variables (including Groq API key)
- MongoDB database configuration
- Troubleshooting common issues

## Face Recognition System
The system uses InsightFace for robust face recognition with enhanced anti-spoofing:

### Continuous Video Face Registration (Admin)
- Single continuous video recording (no separate captures needed)
- Automatic pose detection (front, left, right, up, down)
- Real-time pose guidance with visual feedback
- Quality validation per frame (brightness, sharpness, centering)
- Minimum coverage requirements for registration
- Stores embeddings for each detected pose plus averaged embedding

### Live Video Verification with Anti-Spoofing (Employee)
- Captures multiple video frames for verification
- Enhanced liveness detection with multiple anti-spoofing checks:
  - Texture analysis (detects printed photos)
  - Screen detection using FFT (detects digital displays)
  - Movement detection (requires natural motion)
  - Embedding consistency across frames
  - Pose variation verification
- Uses averaged embedding comparison with stored multi-angle data
- Strict security: attendance only marked when ALL checks pass

### Face Service (Python)
- Runs on port 8000
- Endpoints:
  - `/detect` - Basic face detection
  - `/analyze-frame-base64` - Real-time frame analysis with pose detection
  - `/register-continuous-video` - Continuous video registration with auto pose detection
  - `/verify-live-video` - Live video verification with enhanced liveness checks
- Uses InsightFace buffalo_sc model for face detection and embedding

## Development Setup
- **Frontend**: Runs on port 5000 (Vite dev server)
- **Backend**: Runs on port 3001 (Express server)
- **Database**: MongoDB Atlas (connection configured in backend/config/db.js)

## API Proxy
In development, the Vite dev server proxies API requests:
- `/api/*` routes are proxied to `http://localhost:3001`
- `/socket.io/*` WebSocket connections are proxied to `http://localhost:3001`

## Demo Credentials
- **Admin**: admin@gmail.com / admin
- **Employee**: employee@company.com / EMP001

## Production Deployment
The backend serves the frontend static build in production mode.
- Build command: `cd frontend && npm run build`
- Run command: `cd backend && NODE_ENV=production PORT=5000 node server.js`

## Technologies
- **Frontend**: React 18, Vite, TailwindCSS, React Router, Axios, Socket.IO Client
- **Backend**: Express.js, MongoDB/Mongoose, Socket.IO, JWT Authentication
- **Features**: Face Recognition (face-api.js), Recharts, React Hot Toast
