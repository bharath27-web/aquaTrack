const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Return = require('../models/Return');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { customerId, page = 1, limit = 10 } = req.query;
    const query = {};
    // Role-based filtering: customers see only their own returns
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
    const total = await Return.countDocuments(query);
    const returns = await Return.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('customerId', 'name phone customerId')
      .populate('staffId', 'name vehicleNumber staffId')
      .populate('deliveryId', 'deliveryId scheduledDate');
    res.json({ success: true, data: returns, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.post('/', authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const returnDoc = await Return.create(req.body);
    res.status(201).json({ success: true, data: returnDoc });
  } catch (error) { next(error); }
});

router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const returnDoc = await Return.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!returnDoc) return res.status(404).json({ success: false, message: 'Return not found' });
    res.json({ success: true, data: returnDoc });
  } catch (error) { next(error); }
});

module.exports = router;
