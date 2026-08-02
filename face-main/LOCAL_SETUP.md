# Local Setup Guide - Employee Management System

This guide explains how to run the Employee Management System locally, including Groq API configuration for the AI chatbot.

## Prerequisites

- Node.js v18+ (recommended v20)
- MongoDB database (local or cloud like MongoDB Atlas)
- npm or yarn package manager

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:5000

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# Groq API Configuration (for AI Chatbot)
GROQ_API_KEY=your-groq-api-key-here

# Email Configuration (optional - for welcome emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@companyname.com
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3001/api
VITE_BACKEND_URL=http://localhost:3001
```

## Getting Your Groq API Key

The AI chatbot uses Groq's LLaMA model for intelligent HR assistance. To enable this feature:

1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account or log in
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy the generated key
6. Add it to your backend `.env` file as `GROQ_API_KEY`

**Note:** The chatbot will work without a Groq API key using fallback responses, but AI-powered responses require the API key.

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd employee-management-system
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Setup MongoDB

**Option A: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get the connection string
4. Add to `MONGODB_URI` in backend `.env`

**Option B: Local MongoDB**
1. Install MongoDB locally
2. Start MongoDB service
3. Use `mongodb://localhost:27017/employee_management` as `MONGODB_URI`

### 5. Initialize Database (Optional)

```bash
cd backend
npm run init-db
npm run seed-admin
```

This creates an admin user with default credentials:
- Email: admin@company.com
- Password: admin123

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# or
node server.js
```
Backend runs on: http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:5000

### Production Mode

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Start Backend with Production Mode:**
```bash
cd backend
NODE_ENV=production node server.js
```

## Features Configuration

### Face Recognition
Face recognition models are included in `backend/models/face-models/`. No additional setup required.

### AI Chatbot (Groq)
- Add `GROQ_API_KEY` to enable AI-powered responses
- Without the key, the chatbot uses rule-based fallback responses
- The chatbot handles HR queries, leave policies, salary information, and document generation

### Email Notifications
Configure SMTP settings for:
- Welcome emails to new employees
- Password reset emails
- Leave approval notifications

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify `MONGODB_URI` is correct
   - Check network connectivity
   - Ensure MongoDB Atlas IP whitelist includes your IP

2. **Groq API Not Working**
   - Verify `GROQ_API_KEY` is set correctly
   - Check API key has not expired
   - Ensure you have API quota remaining

3. **Face Models Not Loading**
   - Models are in `backend/models/face-models/`
   - If missing, run: `npm run download-models`

4. **CORS Errors**
   - Ensure `FRONTEND_URL` matches your frontend URL
   - Backend must be running for frontend to work

### Logs Location
- Backend logs: Console output
- Temp files (PDFs): `backend/temp/`

## API Documentation

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - Admin registration

### Employees
- GET `/api/employees` - List all employees (Admin)
- GET `/api/employees/:id` - Get employee details
- POST `/api/employees` - Create employee (Admin)
- PUT `/api/employees/:id` - Update employee
- DELETE `/api/employees/:id` - Delete employee (Admin)

### Payslips
- GET `/api/payslips` - List all payslips
- GET `/api/payslips/employee/:employeeId` - Get employee payslips
- POST `/api/payslips/generate` - Generate payslip (Admin)
- GET `/api/payslips/:id/download` - Download payslip PDF

### AI Chatbot
- POST `/api/bot/message` - Send message to chatbot
- GET `/api/bot/history/:userId` - Get chat history

## Support

For issues or questions:
- Check the troubleshooting section above
- Review console logs for error messages
- Contact HR department for access-related issues
