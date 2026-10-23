const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, syncCustomerAuth } = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');
const Customer = require('../models/Customer');

router.use(protect);

// Customer can get their own profile
router.get('/me', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ userId: req.user._id });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
});

// Admin: sync orphaned customers (create missing User auth accounts)
router.post('/sync-auth', authorize('admin'), syncCustomerAuth);

router.route('/')
  .get(authorize('admin'), getCustomers)
  .post(authorize('admin'), createCustomer);

router.route('/:id')
  .get(authorize('admin', 'staff', 'customer'), getCustomer)
  .put(authorize('admin', 'customer'), updateCustomer)
  .delete(authorize('admin'), deleteCustomer);

module.exports = router;
