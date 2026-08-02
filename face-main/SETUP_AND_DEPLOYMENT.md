# Employee Management System - Setup and Deployment Guide

## Project Overview
A full-stack Employee Management System with React frontend and Node.js/Express backend using MongoDB.

---

## Running Locally

### Prerequisites
- Node.js v18+ installed
- MongoDB database (local or cloud like MongoDB Atlas)
- Git

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd employee-management-system
```

### Step 2: Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the backend folder:
```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/employee_management

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Server Port
PORT=3001

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Google AI (optional - for AI chatbot)
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

4. Start the backend server:
```bash
npm run dev
# Or for production:
npm start
```

The backend will run on `http://localhost:3001`

### Step 3: Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5000`

### Step 4: Access the Application
Open `http://localhost:5000` in your browser.

**Demo Credentials:**
- Admin: `admin@gmail.com` / `admin`
- Employee: Use email with Employee ID as password

---

## Deployment

### Option A: Deploy Backend on Render

1. **Create Render Account**: Go to [render.com](https://render.com)

2. **Create New Web Service**:
   - Connect your GitHub repository
   - Select the repository

3. **Configure Build Settings**:
   - **Name**: `employee-management-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Add Environment Variables** in Render dashboard:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-production-secret
   PORT=3001
   NODE_ENV=production
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

5. Click **Deploy**. Note your backend URL (e.g., `https://employee-management-api.onrender.com`)

### Option B: Deploy Frontend on Netlify

1. **Create Netlify Account**: Go to [netlify.com](https://netlify.com)

2. **Update Frontend API URL**:
   
   Edit `frontend/src/services/api.js`:
   ```javascript
   const API = axios.create({
     baseURL: 'https://your-render-backend-url.onrender.com/api',
     headers: {
       'Content-Type': 'application/json'
     }
   });
   ```

   Or use environment variable:
   ```javascript
   const API = axios.create({
     baseURL: import.meta.env.VITE_API_URL || '/api',
   });
   ```

3. **Build the Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

4. **Deploy to Netlify**:
   
   **Option 1 - Drag & Drop**:
   - Go to Netlify dashboard
   - Drag the `frontend/dist` folder to deploy

   **Option 2 - Connect GitHub**:
   - Click "New site from Git"
   - Connect your GitHub repository
   - Configure:
     - **Base directory**: `frontend`
     - **Build command**: `npm run build`
     - **Publish directory**: `frontend/dist`

5. **Add Environment Variables** in Netlify:
   ```
   VITE_API_URL=https://your-render-backend-url.onrender.com/api
   ```

6. **Configure Redirects** for SPA routing:
   
   Create `frontend/public/_redirects`:
   ```
   /*    /index.html   200
   ```

7. **Deploy**. Your frontend will be at `https://your-app.netlify.app`

---

## Environment Variables Summary

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| MONGODB_URI | MongoDB connection string | `mongodb+srv://...` |
| JWT_SECRET | Secret for JWT tokens | Random string |
| PORT | Server port | `3001` |
| NODE_ENV | Environment | `development` or `production` |
| EMAIL_HOST | SMTP host | `smtp.gmail.com` |
| EMAIL_PORT | SMTP port | `587` |
| EMAIL_USER | Email address | `your@email.com` |
| EMAIL_PASS | Email app password | App-specific password |

### Frontend (Netlify)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | `https://api.example.com/api` |

---

## Troubleshooting

### CORS Issues
If you get CORS errors, ensure your backend allows your frontend domain:
```javascript
// In backend/server.js
app.use(cors({
  origin: ['https://your-netlify-app.netlify.app', 'http://localhost:5000'],
  credentials: true
}));
```

### MongoDB Connection Issues
- Ensure your IP is whitelisted in MongoDB Atlas
- For Render, add `0.0.0.0/0` to allow all IPs

### Build Failures
- Check Node.js version matches (v18+)
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

---

## Support
For issues, check the browser console and server logs for error messages.