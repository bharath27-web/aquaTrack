# 💧 AquaTrack
### Smart Water Delivery. Real-Time Tracking.

> Enterprise MERN Stack Water Supply Delivery & Tracking Management System — Chennai Operational Zone

---

## 🏗️ Project Structure

```
aquaTrack/
├── client/          # React + Vite + Tailwind Frontend
│   └── src/
│       ├── components/    # Reusable UI components (including Leaflet MapView)
│       ├── context/       # React Context (Auth, Socket)
│       ├── layouts/       # Admin, Staff, Customer layouts
│       ├── pages/         # Route pages
│       ├── services/      # API service layer (Axios)
│       └── utils/         # Helpers and constants
│
└── server/          # Node.js + Express + MongoDB Atlas Backend
    ├── controllers/  # Business logic
    ├── middleware/   # Auth, upload, error handling
    ├── models/       # Mongoose schemas
    ├── routes/       # REST API routes
    ├── sockets/      # Socket.IO event handlers
    └── seed.js       # Chennai demo data seed script
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- npm

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

**Server** (`server/.env`):
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aquatrack
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=your_email@domain.com
ADMIN_PASSWORD=your_secure_password
```

**Client** (`client/.env`):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

*Note: No Google Maps API key or billing required. AquaTrack uses open Leaflet & OpenStreetMap tiles out of the box.*

### 3. Seed Chennai Demo Data

```bash
cd server
npm run seed
```

### 4. Start the Application

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 🎉

---

## 🗺️ Real-Time Map System (Chennai, Tamil Nadu)

AquaTrack uses an interactive Leaflet + OpenStreetMap engine centered on Chennai (Lat: 13.0827, Lng: 80.2707):
- **Zero API Keys**: No Google Cloud or billing requirements.
- **Admin Network Map**: View all active delivery staff, customer depots, transit routes across Anna Nagar, T Nagar, Adyar, Velachery, OMR, Porur, Guindy, Tambaram, etc.
- **Staff Operations Map**: View assigned deliveries, drop-off locations, and real-time GPS telemetry.
- **Customer Tracking Map**: Follow assigned delivery van with live ETA, drop-off point, and direct driver contact.

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Landing Route |
|------|-------|----------|---------------|
| 👑 Admin | bharathkraju48@gmail.com | bharathkraju2748 | `/admin/dashboard` |
| 🚚 Staff 1 | arun@aquatrack.com | staff123 | `/staff/dashboard` |
| 🚚 Staff 2 | vijay@aquatrack.com | staff123 | `/staff/dashboard` |
| 👤 Customer | ravi@example.com | customer123 | `/customer/dashboard` |

---

## 📡 API Documentation

### Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | Login with role verification | Public |
| POST | /auth/register | Register customer account | Public |
| GET | /auth/me | Get authenticated session | Bearer |
| GET | /customers | List customers | Admin |
| POST | /customers | Create customer | Admin |
| GET | /deliveries | List deliveries (role-filtered) | All |
| POST | /deliveries | Create delivery | Admin |
| PUT | /deliveries/:id | Update delivery | Admin/Staff |
| GET | /deliveries/today | Staff today's deliveries | Staff |
| GET | /staff | List staff roster | Admin |
| GET | /staff/active/locations | Active staff locations | Admin |
| POST | /locations | Update driver GPS | Staff |
| GET | /analytics/dashboard | Dashboard KPIs | Admin |
| GET | /notifications | User notifications | All |

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `updateLocation` | Client→Server | Staff sends GPS coords |
| `staffLocationUpdate` | Server→Client | Broadcast staff location to admin/customer |
| `deliveryStatusUpdate` | Server→Client | Delivery status changed |
| `staffArrived` | Server→Client | Staff arrived at customer |
| `deliveryCompleted` | Server→Client | Delivery marked done |
| `notificationCreated` | Server→Client | New notification |
| `trackDelivery` | Client→Server | Customer tracks delivery |
| `goOffDuty` | Client→Server | Staff goes offline |

---

## 🛠️ Technology Stack

**Frontend:**
- React 19 + Vite
- Tailwind CSS v4
- Leaflet + React Leaflet (OpenStreetMap)
- React Router v7
- Axios
- Recharts
- Socket.IO Client
- jsPDF
- Lucide React
- React Hot Toast

**Backend:**
- Node.js + Express
- MongoDB Atlas + Mongoose 9
- JWT + bcryptjs
- Socket.IO
- Multer

---

## 🔒 Security

- JWT Bearer token authentication
- bcryptjs password hashing (12 rounds)
- Role verification on login (Admin, Staff, Customer)
- Role-based route authorization & protection
- File upload validation
- Environment variable secrets

---

*AquaTrack — Smart Water Delivery & Tracking Management System*
