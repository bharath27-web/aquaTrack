const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', default: null },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['delivery', 'damage', 'advance', 'refund'], default: 'delivery' },
  method: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'card'], default: 'cash' },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paidAt: { type: Date, default: null },
  notes: { type: String, default: '' },
}, { timestamps: true });

paymentSchema.pre('save', async function() {
  if (!this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentId = `PAY${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
