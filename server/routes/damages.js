const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Damage = require('../models/Damage');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { customerId, status, page = 1, limit = 10 } = req.query;
    const query = {};
    // Role-based data isolation
    if (req.user.role === 'customer') {
      const Customer = require('../models/Customer');
      const customer = await Customer.findOne({ userId: req.user._id });
      if (customer) query.customerId = customer._id;
    } else if (req.user.role === 'staff') {
      const Staff = require('../models/Staff');
      const staff = await Staff.findOne({ userId: req.user._id });
      if (staff) query.staffId = staff._id;
    } else if (customerId) {
      query.customerId = customerId;
    }
    if (status) query.status = status;
    const total = await Damage.countDocuments(query);
    const damages = await Damage.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('customerId', 'name phone customerId')
      .populate('staffId', 'name vehicleNumber staffId')
      .populate('deliveryId', 'deliveryId scheduledDate');
    res.json({ success: true, data: damages, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.post('/', authorize('admin', 'staff'), upload.array('photos', 5), async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.files && req.files.length > 0) {
      data.photos = req.files.map(f => `/uploads/${f.filename}`);
    }
    data.totalCharge = (parseInt(data.damagedCans) || 0) * (parseInt(data.chargePerCan) || 200);
    const damage = await Damage.create(data);
    await damage.populate(['customerId', 'staffId', 'deliveryId']);
    res.status(201).json({ success: true, data: damage });
  } catch (error) { next(error); }
});

router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const damage = await Damage.findByIdAndUpdate(
      req.params.id,
      { ...req.body, reviewedAt: new Date(), reviewedBy: req.user._id },
      { new: true }
    ).populate(['customerId', 'staffId', 'deliveryId']);
    if (!damage) return res.status(404).json({ success: false, message: 'Damage report not found' });
    res.json({ success: true, data: damage });
  } catch (error) { next(error); }
});

module.exports = router;
