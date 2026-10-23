const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Staff = require('../models/Staff');

module.exports = (io) => {
  // Middleware: authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: No token'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 User connected: ${user.name} (${user.role}) - ${socket.id}`);

    // Join role-specific rooms
    socket.join(`user-${user._id}`);
    if (user.role === 'admin') {
      socket.join('admins');
      console.log(`👑 Admin joined: ${user.name}`);
    }

    // Staff location update
    socket.on('updateLocation', async ({ lat, lng }) => {
      if (user.role !== 'staff') return;
      try {
        const staff = await Staff.findOneAndUpdate(
          { userId: user._id },
          { currentLocation: { lat, lng, updatedAt: new Date() }, isOnDuty: true },
          { new: true }
        );
        if (!staff) return;

        // Broadcast to admins
        socket.to('admins').emit('staffLocationUpdate', {
          staffId: staff._id,
          staffName: staff.name,
          vehicleNumber: staff.vehicleNumber,
          vehicleType: staff.vehicleType,
          location: { lat, lng },
          isOnDelivery: staff.isOnDelivery,
          currentDeliveryId: staff.currentDeliveryId,
          status: staff.isOnDelivery ? 'on_delivery' : 'on_duty',
        });

        // If on delivery, also notify customer
        if (staff.currentDeliveryId) {
          const Delivery = require('../models/Delivery');
          const delivery = await Delivery.findById(staff.currentDeliveryId).populate('customerId', 'userId');
          if (delivery?.customerId?.userId) {
            socket.to(`user-${delivery.customerId.userId}`).emit('staffLocationUpdate', {
              staffId: staff._id,
              staffName: staff.name,
              vehicleNumber: staff.vehicleNumber,
              location: { lat, lng },
              deliveryId: staff.currentDeliveryId,
            });
          }
        }
      } catch (err) {
        console.error('Location update error:', err.message);
      }
    });

    // Join delivery room (customer tracking specific delivery)
    socket.on('trackDelivery', (deliveryId) => {
      socket.join(`delivery-${deliveryId}`);
      console.log(`📦 User ${user.name} tracking delivery ${deliveryId}`);
    });

    // Stop tracking
    socket.on('stopTracking', (deliveryId) => {
      socket.leave(`delivery-${deliveryId}`);
    });

    // Staff goes off duty
    socket.on('goOffDuty', async () => {
      if (user.role !== 'staff') return;
      await Staff.findOneAndUpdate({ userId: user._id }, { isOnDuty: false, isOnDelivery: false });
      socket.to('admins').emit('staffOffDuty', { userId: user._id });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${user.name}`);
    });
  });
};
