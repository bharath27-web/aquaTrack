const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'delivery_assigned', 'delivery_on_way', 'delivery_arrived', 'delivery_completed',
      'refill_due', 'damage_reported', 'payment_due', 'general',
      'refill_requested', 'refill_assigned', 'refill_completed'
    ],
    default: 'general',
  },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  referenceType: { type: String, default: null },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
