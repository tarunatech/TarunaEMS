# VPS Deployment Guide (PostgreSQL & Drizzle ORM)

This guide provides step-by-step instructions for deploying **TarunaEMS** (Express Backend + React Frontend + PostgreSQL Database + Face Recognition) on a Linux VPS (Ubuntu 22.04 / 24.04 LTS).

---

## Technical Stack Requirements

- **OS**: Ubuntu 22.04 / 24.04 LTS (or Debian 11/12)
- **Node.js**: v18.x or v20.x LTS
- **Database**: PostgreSQL (v14+) with `pgcrypto` extension
- **Process Manager**: PM2
- **Web Server / Reverse Proxy**: Nginx
- **SSL Certificate**: Let's Encrypt (`certbot`) — *Mandatory for WebRTC Face Recognition Camera permissions*

---

## Key Changes Required for VPS Setup

### 1. Install System Native Dependencies (Crucial for Face Recognition)
The backend uses `@tensorflow/tfjs` and Node `canvas` for face detection. On Linux, `canvas` requires native system libraries before running `npm install`:

```bash
sudo apt update && sudo apt install -y \
  build-essential \
  libcairo2-dev \
  libpango1-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  git \
  curl
```

---

### 2. Install & Configure PostgreSQL Server

1. **Install PostgreSQL**:
   ```bash
   sudo apt install -y postgresql postgresql-contrib
   ```

2. **Create Database & User**:
   ```bash
   sudo -u postgres psql
   ```
   In the PostgreSQL prompt, execute:
   ```sql
   CREATE DATABASE taruna_ems;
   CREATE USER ems_user WITH PASSWORD 'YourSecurePasswordHere';
   GRANT ALL PRIVILEGES ON DATABASE taruna_ems TO ems_user;
   \c taruna_ems
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   \q
   ```

---

### 3. Backend Setup & Configuration

1. **Clone/Upload Repository** to `/var/www/taruna-ems`:
   ```bash
   sudo mkdir -p /var/www/taruna-ems
   sudo chown -R $USER:$USER /var/www/taruna-ems
   # Copy or git clone your project files here
   ```

2. **Configure Backend Environment Variables (`backend/.env`)**:
   ```env
   # PostgreSQL Connection
   DATABASE_URL=postgres://ems_user:YourSecurePasswordHere@localhost:5432/taruna_ems

   # Server Config
   PORT=3001
   NODE_ENV=production

   # Frontend Domain URL (Crucial for CORS & Sockets)
   FRONTEND_URL=https://ems.yourdomain.com
   CORS_ORIGINS=https://ems.yourdomain.com

   # JWT Security
   JWT_SECRET=use_a_long_random_secret_key_here
   JWT_EXPIRE=30d

   # Email Configuration (SMTP)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=your-email@gmail.com

   # Admin Defaults
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=YourAdminPassword
   ```

3. **Install Dependencies & Download Face Models**:
   ```bash
   cd /var/www/taruna-ems/backend
   npm install --production=false
   
   # Download face recognition models if not present
   node scripts/downloadFaceModels.js
   ```

4. **Run Database Migrations & Seed Admin**:
   ```bash
   # Push schema to PostgreSQL via Drizzle ORM
   npx drizzle-kit push
   
   # Seed default admin user
   node scripts/initDB.js
   ```

5. **Configure PM2 Process Manager**:
   ```bash
   sudo npm install -g pm2
   
   # Start backend service
   pm2 start server.js --name ems-backend
   
   # Enable startup on server reboot
   pm2 save
   pm2 startup
   ```

---

### 4. Frontend Setup & Build

1. **Configure Frontend Environment (`frontend/.env.production`)**:
   > **Note**: Vite bakes environment variables into static JS bundles at build time.

   Create `frontend/.env.production`:
   ```env
   VITE_API_URL=https://ems.yourdomain.com/api
   VITE_SOCKET_URL=https://ems.yourdomain.com
   ```

2. **Install & Build Static Files**:
   ```bash
   cd /var/www/taruna-ems/frontend
   npm install
   npm run build
   ```
   This will produce static build files in `/var/www/taruna-ems/frontend/dist`.

---

### 5. Nginx Reverse Proxy Configuration

Create an Nginx site configuration file at `/etc/nginx/sites-available/taruna-ems`:

```nginx
server {
    listen 80;
    server_name ems.yourdomain.com;

    # Maximum file upload size (for images/resumes/face scans)
    client_max_body_size 10M;

    # Frontend Static Files
    root /var/www/taruna-ems/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Uploads Static Assets
    location /uploads/ {
        alias /var/www/taruna-ems/backend/uploads/;
        autoindex off;
    }

    # REST API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket / Socket.IO Proxy (Real-time Chat & Notifications)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site & restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/taruna-ems /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 6. SSL Certificate Setup (Certbot HTTPS)

Modern browsers strictly block camera access (`navigator.mediaDevices.getUserMedia`) over unencrypted HTTP connections. **HTTPS is required for Face Recognition attendance**.

Install Certbot and get SSL certificate:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ems.yourdomain.com
```

---

## Verification & Health Check

1. Test API endpoint:
   ```bash
   curl https://ems.yourdomain.com/api/health
   ```
2. Monitor Backend Logs:
   ```bash
   pm2 logs ems-backend
   ```
3. Test Face Recognition: Open `https://ems.yourdomain.com` in your browser, log in, and grant camera permissions.
