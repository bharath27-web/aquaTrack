const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) { next(error); }
});

router.put('/:id/read', async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: notif });
  } catch (error) { next(error); }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
});

module.exports = router;
