const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Staff = require('../models/Staff');
const Delivery = require('../models/Delivery');

router.use(protect);

// Update staff location (called by staff app)
router.post('/', authorize('staff'), async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'Lat and lng required' });

    const staff = await Staff.findOneAndUpdate(
      { userId: req.user._id },
      { currentLocation: { lat, lng, updatedAt: new Date() }, isOnDuty: true },
      { new: true }
    );

    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    // Emit to all admins and the customer whose delivery is active
    if (req.io) {
      req.io.to('admins').emit('staffLocationUpdate', {
        staffId: staff._id,
        staffName: staff.name,
        vehicleNumber: staff.vehicleNumber,
        location: { lat, lng },
        isOnDelivery: staff.isOnDelivery,
      });

      if (staff.currentDeliveryId) {
        const delivery = await Delivery.findById(staff.currentDeliveryId).populate('customerId', 'userId');
        if (delivery && delivery.customerId) {
          req.io.to(`user-${delivery.customerId.userId}`).emit('staffLocationUpdate', {
            staffId: staff._id,
            staffName: staff.name,
            vehicleNumber: staff.vehicleNumber,
            location: { lat, lng },
            deliveryId: staff.currentDeliveryId,
          });
        }
      }
    }

    res.json({ success: true, message: 'Location updated', data: { lat, lng } });
  } catch (error) { next(error); }
});

// Get staff location
router.get('/:staffId', protect, async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.staffId).select('name vehicleNumber currentLocation isOnDelivery isOnDuty staffId');
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
});

// Staff go off duty
router.post('/off-duty', authorize('staff'), async (req, res, next) => {
  try {
    const staff = await Staff.findOneAndUpdate(
      { userId: req.user._id },
      { isOnDuty: false, isOnDelivery: false },
      { new: true }
    );
    if (req.io) {
      req.io.to('admins').emit('staffOffDuty', { staffId: staff._id });
    }
    res.json({ success: true, message: 'You are now off duty' });
  } catch (error) { next(error); }
});

module.exports = router;
