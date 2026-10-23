const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Rating = require('../models/Rating');
const Staff = require('../models/Staff');
const Delivery = require('../models/Delivery');

router.use(protect);

router.post('/', authorize('customer'), async (req, res, next) => {
  try {
    const { deliveryId, rating, feedback } = req.body;
    const existing = await Rating.findOne({ deliveryId });
    if (existing) return res.status(400).json({ success: false, message: 'Already rated this delivery' });

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.status !== 'delivered') return res.status(400).json({ success: false, message: 'Delivery not completed' });

    const ratingDoc = await Rating.create({
      deliveryId, customerId: delivery.customerId, staffId: delivery.staffId, rating, feedback,
    });

    // Update staff average rating
    const ratings = await Rating.find({ staffId: delivery.staffId });
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    await Staff.findByIdAndUpdate(delivery.staffId, { averageRating: Math.round(avg * 10) / 10, totalRatings: ratings.length });

    await Delivery.findByIdAndUpdate(deliveryId, { isRated: true });
    res.status(201).json({ success: true, data: ratingDoc });
  } catch (error) { next(error); }
});

router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const ratings = await Rating.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('customerId', 'name')
      .populate('staffId', 'name')
      .populate('deliveryId', 'deliveryId');
    res.json({ success: true, data: ratings });
  } catch (error) { next(error); }
});

module.exports = router;
