const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryId: { type: String, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, default: null },
  deliveredAt: { type: Date, default: null },
  cansOrdered: { type: Number, required: true, min: 1 },
  canSize: { type: Number, default: 20 },
  refillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Refill', default: null },
  cansDelivered: { type: Number, default: 0 },
  cansReturned: { type: Number, default: 0 },
  cansDamaged: { type: Number, default: 0 },
  deliveryAddress: { type: String, required: true },
  deliveryLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'on_the_way', 'out_for_delivery', 'arrived', 'delivered', 'failed', 'cancelled', 'rescheduled'],
    default: 'pending',
  },
  amount: { type: Number, default: 0 },
  damageCharges: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  notes: { type: String, default: '' },
  customerConfirmed: { type: Boolean, default: false },
  receiptGenerated: { type: Boolean, default: false },
  isRated: { type: Boolean, default: false },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: '' },
}, { timestamps: true });

deliverySchema.pre('save', async function() {
  if (!this.deliveryId) {
    const count = await mongoose.model('Delivery').countDocuments();
    this.deliveryId = `DEL${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('Delivery', deliverySchema);
