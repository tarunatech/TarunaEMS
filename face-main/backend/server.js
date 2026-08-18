import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import connectDB from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";
import setupShutdown from "./utils/shutdown.js";
import setupChatSocket from "./socket/chat.js";
import { ensureUploadDirs, uploadsDir } from "./config/uploadPaths.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import leadsRoutes from "./routes/leadRoutes.js";
import salesPipelineRoutes from "./routes/salesPipelineRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import botRoutes from "./routes/botRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import { initializeFaceModels } from "./services/faceRecognitionService.js";
import payslipRoutes from "./routes/payslipRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import faceDetectionRoutes from "./routes/faceDetectionRoutes.js";
import schedulerRoutes from "./routes/schedulerRoutes.js";
import { initializeEmailService } from "./services/emailService.js";
import { startTaskStatusScheduler } from "./services/taskSchedulerService.js";
import { startEodReportScheduler } from "./services/eodReportSchedulerService.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import dayBookRoutes from "./routes/dayBookRoutes.js";
import expenseTrackerRoutes from "./routes/expenseTrackerRoutes.js";
import interviewScheduleRoutes from "./routes/interviewScheduleRoutes.js";

// import { createAdminIfNotExists } from './controllers/initAdmin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;

// ----------------- MIDDLEWARE -----------------

// CORS Configuration - MUST BE BEFORE OTHER MIDDLEWARE
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    // and explicitly configured frontend origins.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parsing middleware - MUST BE BEFORE ROUTES
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Static upload folder. Set UPLOAD_DIR on VPS to a persistent absolute path.
ensureUploadDirs();
console.log(`[Uploads] Serving uploaded files from: ${uploadsDir}`);

app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      const fileName = path.basename(filePath);
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    },
  }),
);

// Logging middleware (optional)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ----------------- ROUTES -----------------
// Debug middleware to log all API requests
app.use("/api", (req, res, next) => {
  console.log(
    `[API Debug] ${req.method} ${req.url} - Headers:`,
    req.headers["authorization"] ? "Auth present" : "No Auth",
  );
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/attendance", attendanceRoutes); // NEW: Add attendance routes
app.use("/api/departments", departmentRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/sales-pipelines", salesPipelineRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/face-detection", faceDetectionRoutes);
app.use("/api/payslips", payslipRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/daybooks", dayBookRoutes);
app.use("/api/expense-tracker", expenseTrackerRoutes);
app.use("/api/interviews", interviewScheduleRoutes);
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Employee Management System API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      employees: "/api/employees",
      dashboard: "/api/dashboard",
      leaves: "/api/leaves",
      tasks: "/api/tasks",
      users: "/api/users",
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ----------------- SERVER START -----------------
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ Database connected successfully");

    // Create default admin if doesn't exist
    // await createAdminIfNotExists();
    console.log("✅ Admin user verified/created");

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = new SocketIOServer(httpServer, {
      cors: corsOptions, // Use the same CORS options as Express
      transports: ["websocket", "polling"], // Ensure compatibility
    });

    // Preload face models to avoid cold-start delays
    try {
      await initializeFaceModels();
      console.log("✅ Face models preloaded");
    } catch (e) {
      console.warn(
        "⚠️ Face models preloading failed, will load on demand:",
        e.message,
      );
    }

    // Initialize email service
    const emailServiceReady = initializeEmailService();
    if (emailServiceReady) {
      // Start task status scheduler
      await startTaskStatusScheduler();
    } else {
      console.warn(
        "⚠️ Email service not configured. Task status scheduler will not run.",
      );
    }

    startEodReportScheduler();

    // Setup chat socket handlers
    setupChatSocket(io);

    // Make io accessible to our router
    app.set("io", io);

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Admin Panel: http://localhost:${PORT}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("❌ Server start failed:", err);
    process.exit(1);
  }
};

// Graceful shutdown
setupShutdown();

// Start the server
startServer();

export default app;
