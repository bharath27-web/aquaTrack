const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/damages', require('./routes/damages'));
app.use('/api/refills', require('./routes/refills'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/payments', require('./routes/payments'));

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    database: dbStatus,
    message: 'AquaTrack API is running',
    timestamp: new Date(),
  });
});

// Error middleware
app.use(require('./middleware/errorHandler'));

// Socket.IO
require('./sockets/socketHandler')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 AquaTrack Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled`);
});

const User = require('./models/User');
const Customer = require('./models/Customer');

// ─── Ensure Admin User ───────────────────────────────────────────────────────
const ensureAdminUser = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@aquatrack.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.findOne({ role: 'admin' });
      if (admin) {
        admin.email = adminEmail;
        admin.password = adminPassword;
        await admin.save();
        console.log(`👤 Admin account synchronized: ${adminEmail}`);
      } else {
        await User.create({
          name: 'AquaTrack Administrator',
          email: adminEmail,
          phone: '9876543210',
          password: adminPassword,
          role: 'admin',
        });
        console.log(`👤 Admin account created: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.warn('Notice ensuring admin:', err.message);
  }
};

// ─── Sync Orphaned Customers ─────────────────────────────────────────────────
// Finds Customer records with no valid linked User and creates auth accounts.
// Default password for recovered customers: aquatrack@123
const syncOrphanedCustomers = async () => {
  try {
    const allCustomers = await Customer.find({});
    let created = 0;
    let linked = 0;

    for (const customer of allCustomers) {
      try {
        // If userId is set, check that the User actually exists
        if (customer.userId) {
          const user = await User.findById(customer.userId);
          if (user) {
            // Ensure reverse link
            if (!user.customerId || String(user.customerId) !== String(customer._id)) {
              await User.findByIdAndUpdate(customer.userId, { customerId: customer._id });
            }
            continue; // Already properly linked
          }
        }

        // Customer has no valid User — recover by email first
        const normalizedEmail = customer.email.trim().toLowerCase();
        let existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
          // Link them
          existingUser.customerId = customer._id;
          if (!existingUser.isActive) existingUser.isActive = true;
          await existingUser.save();
          customer.userId = existingUser._id;
          await customer.save();
          linked++;
          console.log(`🔗 Linked existing user to customer: ${normalizedEmail}`);
        } else {
          // Create a new User account with a default password
          const newUser = await User.create({
            name: customer.name,
            email: normalizedEmail,
            phone: customer.phone,
            password: 'aquatrack@123',
            role: 'customer',
            customerId: customer._id,
          });
          customer.userId = newUser._id;
          await customer.save();
          created++;
          console.log(`✅ Created auth account for orphaned customer: ${normalizedEmail}`);
        }
      } catch (err) {
        console.warn(`⚠️ Could not sync customer ${customer.email}: ${err.message}`);
      }
    }

    if (created > 0 || linked > 0) {
      console.log(`🔄 Customer auth sync: ${created} created, ${linked} linked`);
    }
  } catch (err) {
    console.warn('Notice syncing customers:', err.message);
  }
};

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('your_username')) {
      console.warn('⚠️  MONGODB_URI in server/.env is still set to placeholder credentials.');
      console.warn('👉 Please update MONGODB_URI in server/.env with your MongoDB Atlas connection string (or local mongodb://localhost:27017/aquatrack).');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully');
    await ensureAdminUser();
    await syncOrphanedCustomers();
  } catch (err) {
    // Sanitize any potential URI/credentials from error message
    const sanitize = (msg) => (msg || '').replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb+srv://[CREDENTIALS_HIDDEN]@');
    const safeMsg = sanitize(err.message);

    console.error('❌ MongoDB connection failed:', safeMsg);

    // Diagnose real failure category without exposing credentials
    if (err.name === 'MongoParseError') {
      console.error('🔍 Category: Malformed Connection String.');
      console.warn('👉 Check the syntax and format of MONGODB_URI in server/.env.');
    } else if (err.code === 8000 || /authentication|auth/i.test(err.message)) {
      console.error('🔍 Category: Authentication Failure.');
      console.warn('👉 Verify the database user credentials configured in server/.env.');
    } else if (/ENOTFOUND|ESERVFAIL|ENODATA/i.test(err.message)) {
      console.error('🔍 Category: DNS Resolution Failure.');
      console.warn('👉 Verify your internet connection and DNS settings for resolving the MongoDB Atlas hostname.');
    } else if (err.name === 'MongooseServerSelectionError') {
      const servers = err.reason?.servers ? Array.from(err.reason.servers.values()) : [];
      const allTimedOut = servers.length > 0 && servers.every((s) => s.type === 'Unknown' && s.roundTripTime === -1);

      if (allTimedOut) {
        console.error('🔍 Category: Network / Firewall Failure (Port 27017 Blocked).');
        console.warn('👉 Outbound TCP traffic on port 27017 is blocked by your local network / Wi-Fi router / firewall (e.g. campus or corporate Wi-Fi).');
        console.warn('👉 Solutions:');
        console.warn('   1. Switch to a mobile hotspot or home Wi-Fi where port 27017 is open.');
        console.warn('   2. Or run a local MongoDB instance: mongodb://localhost:27017/aquatrack.');
      } else {
        console.error('🔍 Category: Server Selection / IP Access List Failure.');
        console.warn('👉 Verify your MongoDB Atlas IP Access List (whitelist 0.0.0.0/0) and cluster status.');
      }
    } else {
      console.error('🔍 Category: General MongoDB Connection Error.');
      console.warn('👉 Check your network connection and server/.env configuration.');
    }
  }
};

connectDB();

module.exports = { app, io };
