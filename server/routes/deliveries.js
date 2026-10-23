const express = require('express');
const router = express.Router();
const { getDeliveries, getDelivery, createDelivery, updateDelivery, deleteDelivery, getTodayDeliveries, getDeliveryStats } = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getDeliveries)
  .post(authorize('admin'), createDelivery);

router.get('/today', authorize('staff'), getTodayDeliveries);
router.get('/stats', authorize('staff', 'admin'), getDeliveryStats);

router.route('/:id')
  .get(getDelivery)
  .put(authorize('admin', 'staff'), updateDelivery)
  .delete(authorize('admin'), deleteDelivery);

module.exports = router;
