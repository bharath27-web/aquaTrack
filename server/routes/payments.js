const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { customerId, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ userId: req.user._id });
      if (customer) query.customerId = customer._id;
    }
    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('customerId', 'name phone customerId')
      .populate('deliveryId', 'deliveryId scheduledDate');
    res.json({ success: true, data: payments, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const payment = await Payment.create(req.body);
    if (req.body.status === 'completed') {
      await Customer.findByIdAndUpdate(req.body.customerId, { $inc: { outstandingBalance: -req.body.amount } });
    }
    res.status(201).json({ success: true, data: payment });
  } catch (error) { next(error); }
});

module.exports = router;
