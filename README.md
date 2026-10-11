# Let's Go — Social Activity Discovery Platform (MERN + PWA)

> **"You don't need a group to join. You join to find your group."**

Let's Go is a mobile-first Progressive Web App (PWA) built with the MERN stack that connects people who want to participate in real-world activities (cricket, cycling, badminton, trekking, board games, food outings, and more) with others in their locality.

Initial launch city: **Kasaragod, Kerala, India** (architected to scale globally).

---

## 📱 Visual Design & UI System

The application faithfully implements the official **Let's Go Design System**:
- **Emerald Primary Action:** `#08B981` (emerald green primary buttons, radio selections, availability indicators)
- **Dark Navy Canvas/Hero:** `#10172A`
- **Secondary Accent:** `#2563EB`
- **Background:** `#F8FAFC` (Light) / `#0B1120` (Dark Mode with persisted user preference)
- **Typography:** Plus Jakarta Sans & Inter
- **Mobile-first Navigation:** Bottom navigation bar on mobile (Home, Explore, Create elevated emerald button, My Activity, Profile) & compact sidebar navigation on desktop.

---

## 🛠 Technology Stack

### Frontend
- **React 18** with **Vite**
- **Tailwind CSS** with custom design tokens and dark mode support
- **React Router v6** with nested layouts, public & protected route guards
- **TanStack Query (React Query v5)** for optimistic mutations and server state management
- **Socket.IO Client** for persistent real-time room communication
- **Leaflet & OpenStreetMap** for zero-API-key privacy-preserving activity location mapping
- **Lucide React** for icons
- **Progressive Web App (PWA):** Service worker (`sw.js`), standalone manifest, responsive icons, offline fallback page (`offline.html`), and Web Push notifications.

### Backend
- **Node.js (>= 18.17)** & **Express.js**
- **MongoDB** with **Mongoose ODM** (geospatial indexing, validation, unique constraints)
- **JWT Authentication:** Short-lived access tokens + rotating HTTP-only refresh tokens with reuse detection
- **Password Hashing:** Argon2id / bcrypt with high work factor
- **Socket.IO Server:** Authorized room channels and real-time event distribution
- **Structured Logging & Centralized Error Handling**
- **Input Validation & Sanitization**

### Explicit Infrastructure Architecture
- **No Docker / No Containers:** Runs directly on standard host operating systems using Node.js, npm, and MongoDB.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** >= 18.17.0
- **MongoDB** >= 6.0 running locally on port 27017 or a MongoDB Atlas connection string.
- Standard npm CLI

### 2. Clone and Install Dependencies
From the repository root:
```bash
# Install root, backend, and frontend packages
npm run install:all
```
Or manually:
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Environment Configuration
Create environment files in `server` and `client`:

#### Backend (`server/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/letsgo
CLIENT_ORIGIN=http://localhost:5173
API_BASE_URL=http://localhost:5000/api/v1
ACCESS_TOKEN_SECRET=your_super_secret_access_key_change_in_production_min_32_chars
REFRESH_TOKEN_SECRET=your_super_secret_refresh_key_change_in_production_min_32_chars
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@letsgo.dev
FRONTEND_PUBLIC_URL=http://localhost:5173
```

#### Frontend (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Seed Realistic Demo Data
Populate the database with the sample data matching the mockup screens (Aman's Sunday Cricket Crew room, polls, chats, members, and categories):
```bash
npm run seed
```
Demo credentials created:
- **User:** `aman.ka` (`aman_ka@example.dev`) | Password: `Passw0rd!23`
- **Admin:** `admin@letsgo.dev` | Password: `Admin!2345`

### 5. Start Development Servers
Run the backend and frontend concurrently in two terminal tabs:

**Terminal 1 (Backend API & Socket server on port 5000):**
```bash
npm run dev:server
```

**Terminal 2 (Frontend Vite dev server on port 5173):**
```bash
npm run dev:client
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

### Server Test Suite (Vitest + Supertest)
```bash
npm run test:server
```
Runs 37 automated tests covering:
- User registration, login, logout, refresh token rotation, reuse detection
- Activity discovery, creation, capacity enforcement under concurrent requests
- Joining open rooms, approval request workflow
- Scheduling polls, availability voting, voting deadlines, schedule confirmation
- Safety: report creation, user blocking and unblocking

### Frontend Test Suite
```bash
npm run test:client
```

### Production Build
```bash
npm run build
```

---

## 🌐 Production VPS Deployment (Ubuntu / Debian Linux)

Deploy directly on a standard Linux virtual private server (e.g. DigitalOcean, Hetzner, AWS EC2, Linode) without Docker.

### 1. Server Setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. MongoDB Installation
```bash
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

### 3. Application Deployment
```bash
git clone https://github.com/your-org/letsgo.git /var/www/letsgo
cd /var/www/letsgo
npm run install:all
cd client && npm run build
```

### 4. PM2 Process Management
```bash
cd /var/www/letsgo/server
pm2 start src/server.js --name "letsgo-api" -i max
pm2 save
pm2 startup
```

### 5. Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/letsgo`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/letsgo/client/dist;
    index index.html;

    # Static assets caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO WebSocket reverse proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    # Single Page App fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
Enable site and acquire SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/letsgo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔒 Security Best Practices

- **Strict Token Security:** Access tokens in memory/header; HTTP-only SameSite cookies for refresh sessions.
- **CSRF Mitigation:** Required custom headers on refresh requests.
- **NoSQL Injection Defense:** Sanitized queries and parameterized regex escaping.
- **XSS Prevention:** React JSX escaping and sanitized rich text rendering.
- **PWA Cache Privacy:** API routes and authentication endpoints are explicitly bypassed by the service worker.
- **Rate Limiting:** Protects `/api/v1/auth/*` and room join/voting endpoints.

---

## 📄 License
ISC License © Let's Go Team.
