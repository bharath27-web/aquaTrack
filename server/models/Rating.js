const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: '' },
  ratedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
