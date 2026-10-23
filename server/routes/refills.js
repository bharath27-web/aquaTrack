const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Refill = require('../models/Refill');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const User = require('../models/User');

router.use(protect);

// Helper for notifications
const createNotification = async (userId, title, message, type, referenceId, referenceType) => {
  try {
    return await Notification.create({ userId, title, message, type, referenceId, referenceType });
  } catch (e) {
    console.error('Notification error:', e.message);
    return null;
  }
};

// @desc    Get all refills with role restrictions & filters
// @route   GET /api/refills
// @access  Customer (own only), Staff (assigned only), Admin (all)
router.get('/', async (req, res, next) => {
  try {
    const { customerId, status, dueDate, search, page = 1, limit = 10 } = req.query;
    const query = {};

    // Strict role-based isolation
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ userId: req.user._id });
      if (!customer) {
        return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 } });
      }
      query.customerId = customer._id;
    } else if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ userId: req.user._id });
      if (!staff) {
        return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 } });
      }
      query.assignedStaffId = staff._id;
    } else if (customerId) {
      query.customerId = customerId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { refillId: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query.requestedDate = { $gte: today, $lt: tomorrow };
      } else if (dueDate === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);
        query.requestedDate = { $gte: tomorrow, $lt: dayAfter };
      } else if (dueDate === 'week') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        query.requestedDate = { $gte: today, $lte: nextWeek };
      }
    }

    const total = await Refill.countDocuments(query);
    const refills = await Refill.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('customerId', 'name phone email address city pincode location customerId canCapacity')
      .populate('assignedStaffId', 'name phone vehicleNumber vehicleType staffId')
      .populate('deliveryId', 'deliveryId status deliveredAt cansDelivered amount paymentStatus');

    res.json({
      success: true,
      data: refills,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single refill
// @route   GET /api/refills/:id
// @access  Customer (own only), Staff (assigned only), Admin
router.get('/:id', async (req, res, next) => {
  try {
    const refill = await Refill.findById(req.params.id)
      .populate('customerId', 'name phone email address city pincode location customerId userId')
      .populate('assignedStaffId', 'name phone vehicleNumber vehicleType staffId userId')
      .populate('deliveryId');

    if (!refill) {
      return res.status(404).json({ success: false, message: 'Refill not found' });
    }

    // Role verification
    if (req.user.role === 'customer') {
      if (refill.customerId?.userId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied: not your refill request' });
      }
    } else if (req.user.role === 'staff') {
      if (refill.assignedStaffId?.userId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied: not assigned to you' });
      }
    }

    res.json({ success: true, data: refill });
  } catch (error) {
    next(error);
  }
});

// @desc    Create refill request (Customer or Admin)
// @route   POST /api/refills
// @access  Customer, Admin
router.post('/', async (req, res, next) => {
  try {
    let targetCustomerId;
    let customer;

    // Never trust customerId sent from browser for customer role
    if (req.user.role === 'customer') {
      customer = await Customer.findOne({ userId: req.user._id });
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer profile not found' });
      }
      targetCustomerId = customer._id;
    } else if (req.user.role === 'admin') {
      if (!req.body.customerId) {
        return res.status(400).json({ success: false, message: 'Please select a customer' });
      }
      customer = await Customer.findById(req.body.customerId);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      targetCustomerId = customer._id;
    } else {
      return res.status(403).json({ success: false, message: 'Staff cannot create refill requests' });
    }

    const { requestedDate, scheduledDate, requestedTime, quantity, cansCount, canSize, notes } = req.body;

    // Validation: Date
    const rawDate = requestedDate || scheduledDate;
    if (!rawDate) {
      return res.status(400).json({ success: false, message: 'Please specify a refill date' });
    }
    const targetDate = new Date(rawDate);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid refill date provided' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(targetDate);
    dateToCheck.setHours(0, 0, 0, 0);
    if (dateToCheck < today) {
      return res.status(400).json({ success: false, message: 'Refill date cannot be in the past' });
    }

    // Validation: Preferred Time
    const prefTime = (requestedTime || '').trim() || '10:00 AM';

    // Validation: Quantity
    const qty = parseInt(quantity != null ? quantity : cansCount, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1 can' });
    }

    // Validation: Can Size (default 20 Litres)
    const size = parseInt(canSize, 10) || 20;
    if (size <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid can size' });
    }

    // Prevent duplicate accidental submissions within 15 seconds
    const recentSubmissions = await Refill.findOne({
      customerId: targetCustomerId,
      createdAt: { $gte: new Date(Date.now() - 15000) },
      quantity: qty,
      status: 'pending',
    });
    if (recentSubmissions) {
      return res.status(400).json({
        success: false,
        message: 'A refill request was just submitted. Please wait a moment before submitting again.',
      });
    }

    // Create Refill Request in MongoDB
    const refill = await Refill.create({
      customerId: targetCustomerId,
      requestedDate: targetDate,
      scheduledDate: targetDate,
      requestedTime: prefTime,
      quantity: qty,
      cansCount: qty,
      canSize: size,
      status: 'pending',
      notes: (notes || '').trim(),
    });

    // Create corresponding Delivery in pending status so it seamlessly integrates with existing delivery workflow
    const delivery = await Delivery.create({
      customerId: targetCustomerId,
      staffId: null,
      scheduledDate: targetDate,
      scheduledTime: prefTime,
      cansOrdered: qty,
      canSize: size,
      deliveryAddress: customer.address + (customer.city ? `, ${customer.city}` : ''),
      deliveryLocation: customer.location || { lat: null, lng: null },
      status: 'pending',
      amount: qty * 60,
      refillId: refill._id,
      notes: (notes || '').trim(),
    });

    refill.deliveryId = delivery._id;
    await refill.save();

    await refill.populate('customerId', 'name phone email address city pincode customerId');
    await refill.populate('deliveryId');

    // Notify Admins
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        const notif = await createNotification(
          admin._id,
          'New Refill Request 💧',
          `${customer.name} requested ${qty} × ${size}L cans for ${targetDate.toLocaleDateString('en-IN')} at ${prefTime}`,
          'refill_requested',
          refill._id,
          'Refill'
        );
        if (req.io && notif) {
          req.io.to(`user-${admin._id}`).emit('notificationCreated', notif);
        }
      }
      if (req.io) {
        req.io.to('admins').emit('newRefillRequest', { refill, customer, delivery });
        req.io.to('admins').emit('deliveryCreated', delivery);
      }
    } catch (notifErr) {
      console.error('Notification error on refill creation:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Refill request submitted successfully! Admin will assign delivery staff.',
      data: refill,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Assign delivery staff to a refill request (Admin)
// @route   PUT /api/refills/:id/assign
// @access  Admin
router.put('/:id/assign', authorize('admin'), async (req, res, next) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Please select a delivery staff member' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const refill = await Refill.findById(req.params.id).populate('customerId');
    if (!refill) {
      return res.status(404).json({ success: false, message: 'Refill request not found' });
    }

    // Update Refill
    refill.assignedStaffId = staff._id;
    refill.status = 'assigned';
    await refill.save();

    // Update or create linked Delivery
    let delivery = null;
    if (refill.deliveryId) {
      delivery = await Delivery.findByIdAndUpdate(
        refill.deliveryId,
        { staffId: staff._id, status: 'assigned' },
        { new: true }
      ).populate('customerId').populate('staffId');
    } else {
      const cust = refill.customerId;
      delivery = await Delivery.create({
        customerId: cust._id,
        staffId: staff._id,
        scheduledDate: refill.requestedDate || refill.scheduledDate,
        scheduledTime: refill.requestedTime,
        cansOrdered: refill.quantity || refill.cansCount,
        canSize: refill.canSize || 20,
        deliveryAddress: cust.address + (cust.city ? `, ${cust.city}` : ''),
        deliveryLocation: cust.location || { lat: null, lng: null },
        status: 'assigned',
        amount: (refill.quantity || refill.cansCount) * 60,
        refillId: refill._id,
      });
      refill.deliveryId = delivery._id;
      await refill.save();
      await delivery.populate(['customerId', 'staffId']);
    }

    // Update staff deliveries count
    await Staff.findByIdAndUpdate(staff._id, { $inc: { totalDeliveries: 1 } });

    // Populate for response
    await refill.populate('assignedStaffId', 'name phone vehicleNumber vehicleType staffId');
    await refill.populate('deliveryId');

    // Send notifications & Socket events
    try {
      // 1. Notify Staff
      if (staff.userId) {
        const staffNotif = await createNotification(
          staff.userId,
          'New Delivery Assigned 📋',
          `You have been assigned to deliver ${refill.quantity} cans (${refill.canSize || 20}L) to ${refill.customerId?.name} at ${refill.requestedTime || '10:00 AM'}.`,
          'delivery_assigned',
          delivery ? delivery._id : refill._id,
          'Delivery'
        );
        if (req.io) {
          if (staffNotif) req.io.to(`user-${staff.userId}`).emit('notificationCreated', staffNotif);
          req.io.to(`user-${staff.userId}`).emit('deliveryAssigned', { delivery, refill });
        }
      }

      // 2. Notify Customer
      const customerUserId = refill.customerId?.userId;
      if (customerUserId) {
        const custNotif = await createNotification(
          customerUserId,
          'Refill Request Assigned 🚚',
          `Staff ${staff.name} (${staff.vehicleNumber}) has been assigned to your refill request of ${refill.quantity} cans.`,
          'refill_assigned',
          refill._id,
          'Refill'
        );
        if (req.io) {
          if (custNotif) req.io.to(`user-${customerUserId}`).emit('notificationCreated', custNotif);
          req.io.to(`user-${customerUserId}`).emit('refillStatusUpdate', {
            refillId: refill._id,
            status: 'assigned',
            staff: { name: staff.name, phone: staff.phone, vehicleNumber: staff.vehicleNumber },
          });
          if (delivery) {
            req.io.to(`user-${customerUserId}`).emit('deliveryStatusUpdate', {
              deliveryId: delivery._id,
              status: 'assigned',
            });
          }
        }
      }

      // 3. Notify Admins
      if (req.io && delivery) {
        req.io.to('admins').emit('deliveryStatusUpdate', {
          deliveryId: delivery._id,
          status: 'assigned',
          delivery,
        });
      }
    } catch (notifErr) {
      console.error('Notification error on assign:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Staff ${staff.name} assigned successfully`,
      data: refill,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update refill (Admin)
// @route   PUT /api/refills/:id
// @access  Admin
router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const refill = await Refill.findById(req.params.id);
    if (!refill) {
      return res.status(404).json({ success: false, message: 'Refill not found' });
    }

    const { status, notes, assignedStaffId, quantity, canSize, requestedDate, requestedTime } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (assignedStaffId !== undefined) updates.assignedStaffId = assignedStaffId;
    if (quantity) {
      updates.quantity = quantity;
      updates.cansCount = quantity;
    }
    if (canSize) updates.canSize = canSize;
    if (requestedDate) {
      updates.requestedDate = new Date(requestedDate);
      updates.scheduledDate = new Date(requestedDate);
    }
    if (requestedTime) updates.requestedTime = requestedTime;

    const updatedRefill = await Refill.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('customerId', 'name phone email address city customerId')
      .populate('assignedStaffId', 'name phone vehicleNumber vehicleType staffId')
      .populate('deliveryId');

    // If status is cancelled, also cancel linked delivery
    if (status === 'cancelled' && refill.deliveryId) {
      await Delivery.findByIdAndUpdate(refill.deliveryId, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: notes || 'Refill cancelled by admin',
      });
    }

    res.json({ success: true, data: updatedRefill });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
