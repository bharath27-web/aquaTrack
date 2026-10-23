const mongoose = require('mongoose');
const Delivery = require('../models/Delivery');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Return = require('../models/Return');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Refill = require('../models/Refill');

const createNotification = async (userId, title, message, type, referenceId, referenceType) => {
  try {
    const notif = await Notification.create({ userId, title, message, type, referenceId, referenceType });
    return notif;
  } catch (e) { console.error('Notification error:', e.message); }
};

// @desc    Get all deliveries
// @route   GET /api/deliveries
const getDeliveries = async (req, res, next) => {
  try {
    const { search, status, staffId, customerId, date, page = 1, limit = 10 } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ userId: req.user._id });
      if (customer) query.customerId = customer._id;
    } else if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ userId: req.user._id });
      if (staff) query.staffId = staff._id;
    }

    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',').map((s) => s.trim()) };
      } else {
        query.status = status;
      }
    }
    if (staffId) query.staffId = staffId;
    if (customerId) query.customerId = customerId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.scheduledDate = { $gte: start, $lte: end };
    }
    if (search) {
      query.$or = [{ deliveryId: { $regex: search, $options: 'i' } }];
    }

    const total = await Delivery.countDocuments(query);
    const deliveries = await Delivery.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('customerId', 'name phone address city location customerId')
      .populate('staffId', 'name phone vehicleNumber vehicleType staffId');

    res.json({
      success: true,
      data: deliveries,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

// @desc    Get single delivery
const getDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('customerId', 'name phone address city location customerId canCount')
      .populate('staffId', 'name phone vehicleNumber vehicleType staffId currentLocation');
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    res.json({ success: true, data: delivery });
  } catch (error) { next(error); }
};

// @desc    Create delivery
const createDelivery = async (req, res, next) => {
  try {
    const { customerId, staffId, scheduledDate, scheduledTime, cansOrdered, canSize, notes, amount } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const delivery = await Delivery.create({
      customerId, staffId: staffId || null, scheduledDate, scheduledTime,
      cansOrdered, canSize: canSize || 20, notes, amount: amount || 0,
      deliveryAddress: customer.address + ', ' + customer.city,
      deliveryLocation: customer.location,
      status: staffId ? 'assigned' : 'pending',
    });

    // Notify customer
    const customerUser = await User.findById(customer.userId);
    if (customerUser) {
      const notif = await createNotification(
        customerUser._id, 'New Delivery Scheduled',
        `Your delivery of ${cansOrdered} cans has been scheduled for ${new Date(scheduledDate).toLocaleDateString('en-IN')}`,
        'delivery_assigned', delivery._id, 'Delivery'
      );
      if (req.io && notif) {
        req.io.to(`user-${customerUser._id}`).emit('notificationCreated', notif);
      }
    }

    await delivery.populate(['customerId', 'staffId']);
    res.status(201).json({ success: true, data: delivery });
  } catch (error) { next(error); }
};

// @desc    Update delivery status
const updateDelivery = async (req, res, next) => {
  try {
    const { status, cansDelivered, cansReturned, cansDamaged, damageCharges, notes, staffId } = req.body;
    const delivery = await Delivery.findById(req.params.id).populate('customerId');
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });

    const updates = { ...req.body };
    const isNewlyDelivered = status === 'delivered' && delivery.status !== 'delivered';

    if (status === 'delivered') {
      updates.deliveredAt = updates.deliveredAt || new Date();
      const delivered = (cansDelivered !== undefined && cansDelivered !== null && cansDelivered !== '')
        ? Number(cansDelivered)
        : (delivery.cansDelivered || delivery.cansOrdered || 0);
      const returned = (cansReturned !== undefined && cansReturned !== null && cansReturned !== '')
        ? Number(cansReturned)
        : (delivery.cansReturned || 0);
      const damaged = (cansDamaged !== undefined && cansDamaged !== null && cansDamaged !== '')
        ? Number(cansDamaged)
        : (delivery.cansDamaged || 0);
      updates.cansDelivered = delivered;
      updates.cansReturned = returned;
      updates.cansDamaged = damaged;

      // Update customer can count
      await Customer.findByIdAndUpdate(delivery.customerId._id, {
        $inc: { canCount: delivered - returned, totalDeliveries: 1, totalReturns: returned },
        lastDeliveryDate: new Date(),
      });

      // Create return record
      if (returned > 0 || delivered > 0) {
        await Return.create({
          deliveryId: delivery._id,
          customerId: delivery.customerId._id,
          staffId: delivery.staffId,
          cansDelivered: delivered,
          cansReturned: returned,
        });
      }

      // Notify customer
      const customerUser = await User.findById(delivery.customerId.userId);
      if (customerUser) {
        const notif = await createNotification(
          customerUser._id, 'Delivery Completed!',
          `Your delivery of ${delivered} cans has been completed successfully.`,
          'delivery_completed', delivery._id, 'Delivery'
        );
        if (req.io && notif) {
          req.io.to(`user-${customerUser._id}`).emit('notificationCreated', notif);
          req.io.to(`user-${customerUser._id}`).emit('deliveryCompleted', { deliveryId: delivery._id, status: 'delivered' });
        }
      }
    }

    if (status === 'on_the_way') {
      const staffMember = await Staff.findById(delivery.staffId);
      if (staffMember) {
        await Staff.findByIdAndUpdate(delivery.staffId, { isOnDelivery: true, currentDeliveryId: delivery._id });
      }
      // Notify customer
      const customerUser = await User.findById(delivery.customerId.userId);
      if (customerUser) {
        const notif = await createNotification(
          customerUser._id, 'Your delivery is on the way! 🚚',
          'Your delivery staff is heading to your location.',
          'delivery_on_way', delivery._id, 'Delivery'
        );
        if (req.io && notif) {
          req.io.to(`user-${customerUser._id}`).emit('notificationCreated', notif);
          req.io.to(`user-${customerUser._id}`).emit('deliveryStatusUpdate', { deliveryId: delivery._id, status: 'on_the_way' });
        }
      }
    }

    if (status === 'arrived') {
      const customerUser = await User.findById(delivery.customerId.userId);
      if (customerUser) {
        const notif = await createNotification(
          customerUser._id, 'Delivery Staff Has Arrived! 📍',
          'Your delivery staff has arrived at your location.',
          'delivery_arrived', delivery._id, 'Delivery'
        );
        if (req.io && notif) {
          req.io.to(`user-${customerUser._id}`).emit('notificationCreated', notif);
          req.io.to(`user-${customerUser._id}`).emit('staffArrived', { deliveryId: delivery._id });
        }
      }
    }

    if (status === 'assigned' && staffId) {
      await Staff.findByIdAndUpdate(staffId, { $inc: { totalDeliveries: 1 } });
    }

    if (status === 'delivered' || status === 'cancelled' || status === 'failed') {
      await Staff.findByIdAndUpdate(delivery.staffId, {
        isOnDelivery: false,
        currentDeliveryId: null,
        ...(isNewlyDelivered ? { $inc: { completedDeliveries: 1 } } : {}),
      });
    }

    Object.assign(delivery, updates);
    await delivery.save();
    await delivery.populate(['customerId', 'staffId']);

    // Sync status with linked Refill if one exists
    try {
      const refill = delivery.refillId
        ? await Refill.findById(delivery.refillId)
        : await Refill.findOne({ deliveryId: delivery._id });

      if (refill) {
        if (status === 'on_the_way' || status === 'arrived') {
          refill.status = 'out_for_delivery';
          await refill.save();
        } else if (status === 'delivered') {
          refill.status = 'delivered';
          refill.actualDate = new Date();
          await refill.save();
        } else if (status === 'cancelled' || status === 'failed') {
          refill.status = 'cancelled';
          await refill.save();
        } else if (status === 'assigned' && staffId) {
          refill.status = 'assigned';
          refill.assignedStaffId = staffId;
          await refill.save();
        }

        const custUserId = delivery.customerId?.userId;
        if (req.io && custUserId) {
          req.io.to(`user-${custUserId}`).emit('refillStatusUpdate', {
            refillId: refill._id,
            status: refill.status,
          });
        }
      }
    } catch (refillSyncErr) {
      console.error('Error syncing refill with delivery update:', refillSyncErr.message);
    }

    if (req.io) {
      req.io.to('admins').emit('deliveryStatusUpdate', { deliveryId: delivery._id, status: delivery.status, delivery });
      if (delivery.staffId) {
        const staffDoc = await Staff.findById(delivery.staffId).select('userId');
        if (staffDoc?.userId) {
          req.io.to(`user-${staffDoc.userId}`).emit('deliveryStatusUpdate', { deliveryId: delivery._id, status: delivery.status, delivery });
          if (status === 'delivered') {
            req.io.to(`user-${staffDoc.userId}`).emit('deliveryCompleted', { deliveryId: delivery._id, status: 'delivered', delivery });
          }
        }
      }
    }

    res.json({ success: true, data: delivery });
  } catch (error) { next(error); }
};

// @desc    Delete delivery
const deleteDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancelledAt: new Date() },
      { new: true }
    );
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });

    if (delivery.refillId) {
      await Refill.findByIdAndUpdate(delivery.refillId, { status: 'cancelled' });
    } else {
      await Refill.findOneAndUpdate({ deliveryId: delivery._id }, { status: 'cancelled' });
    }

    res.json({ success: true, message: 'Delivery cancelled' });
  } catch (error) { next(error); }
};

// @desc    Get today's deliveries for staff
const getTodayDeliveries = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Deliveries scheduled for today, delivered today, or currently active/assigned
    let deliveries = await Delivery.find({
      staffId: staff._id,
      $or: [
        { scheduledDate: { $gte: today, $lt: tomorrow } },
        { deliveredAt: { $gte: today, $lt: tomorrow } },
        { status: { $in: ['assigned', 'on_the_way', 'out_for_delivery', 'arrived'] } },
      ],
      status: { $nin: ['cancelled'] },
    })
      .sort({ updatedAt: -1, scheduledDate: 1 })
      .populate('customerId', 'name phone address city location customerId');

    // If no deliveries scheduled for today or active, include recent assigned/delivered deliveries so completed deliveries are visible
    if (deliveries.length === 0) {
      deliveries = await Delivery.find({
        staffId: staff._id,
        status: { $nin: ['cancelled'] },
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .populate('customerId', 'name phone address city location customerId');
    }

    // Calculate accurate database-driven statistics for this staff member
    const [
      totalAssigned,
      pending,
      assigned,
      inProgress,
      completed,
      deliveredAggregate
    ] = await Promise.all([
      Delivery.countDocuments({ staffId: staff._id, status: { $nin: ['cancelled'] } }),
      Delivery.countDocuments({ staffId: staff._id, status: 'pending' }),
      Delivery.countDocuments({ staffId: staff._id, status: 'assigned' }),
      Delivery.countDocuments({ staffId: staff._id, status: { $in: ['on_the_way', 'out_for_delivery', 'arrived'] } }),
      Delivery.countDocuments({ staffId: staff._id, status: 'delivered' }),
      Delivery.aggregate([
        { $match: { staffId: new mongoose.Types.ObjectId(staff._id), status: 'delivered' } },
        {
          $group: {
            _id: null,
            totalCansDelivered: { $sum: '$cansDelivered' },
            totalCansReturned: { $sum: '$cansReturned' },
          },
        },
      ]),
    ]);

    const totalCansDelivered = deliveredAggregate[0]?.totalCansDelivered || 0;
    const totalCansReturned = deliveredAggregate[0]?.totalCansReturned || 0;

    const stats = {
      totalAssigned,
      pending: pending + assigned,
      pendingOnly: pending,
      assignedOnly: assigned,
      inProgress,
      completed,
      totalCansDelivered,
      totalCansReturned,
    };

    res.json({ success: true, data: deliveries, staff, stats });
  } catch (error) { next(error); }
};

// @desc    Get delivery statistics (for staff or admin)
// @route   GET /api/deliveries/stats
const getDeliveryStats = async (req, res, next) => {
  try {
    let staffId = null;
    let staff = null;

    if (req.user.role === 'staff') {
      staff = await Staff.findOne({ userId: req.user._id });
      if (!staff) return res.status(404).json({ success: false, message: 'Staff profile not found' });
      staffId = staff._id;
    } else if (req.query.staffId) {
      staffId = req.query.staffId;
      staff = await Staff.findById(staffId);
    }

    const query = {};
    if (staffId) {
      query.staffId = new mongoose.Types.ObjectId(staffId);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAssigned,
      pending,
      assigned,
      inProgress,
      completed,
      deliveredAggregate
    ] = await Promise.all([
      Delivery.countDocuments({ ...query, status: { $nin: ['cancelled'] } }),
      Delivery.countDocuments({ ...query, status: 'pending' }),
      Delivery.countDocuments({ ...query, status: 'assigned' }),
      Delivery.countDocuments({ ...query, status: { $in: ['on_the_way', 'out_for_delivery', 'arrived'] } }),
      Delivery.countDocuments({ ...query, status: 'delivered' }),
      Delivery.aggregate([
        { $match: { ...query, status: 'delivered' } },
        {
          $group: {
            _id: null,
            totalCansDelivered: { $sum: '$cansDelivered' },
            totalCansReturned: { $sum: '$cansReturned' },
          },
        },
      ]),
    ]);

    const totalCansDelivered = deliveredAggregate[0]?.totalCansDelivered || 0;
    const totalCansReturned = deliveredAggregate[0]?.totalCansReturned || 0;

    res.json({
      success: true,
      data: {
        totalAssigned,
        pending: pending + assigned,
        pendingOnly: pending,
        assignedOnly: assigned,
        inProgress,
        completed,
        totalCansDelivered,
        totalCansReturned,
      },
      staff,
    });
  } catch (error) { next(error); }
};

module.exports = {
  getDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getTodayDeliveries,
  getDeliveryStats,
};
