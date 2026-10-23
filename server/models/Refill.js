const mongoose = require('mongoose');

const refillSchema = new mongoose.Schema({
  refillId: { type: String, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  requestedDate: { type: Date, required: true },
  scheduledDate: { type: Date }, // preserved for backwards compatibility
  requestedTime: { type: String, default: '10:00 AM' },
  quantity: { type: Number, required: true, min: 1 },
  cansCount: { type: Number }, // preserved for backwards compatibility
  canSize: { type: Number, default: 20 },
  status: {
    type: String,
    enum: [
      'pending', 'approved', 'assigned', 'out_for_delivery', 'delivered', 'cancelled',
      'scheduled', 'due', 'completed', 'rescheduled', 'skipped'
    ],
    default: 'pending',
  },
  assignedStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', default: null },
  actualDate: { type: Date, default: null },
  notes: { type: String, default: '' },
}, { timestamps: true });

refillSchema.pre('save', async function() {
  if (!this.refillId) {
    const count = await mongoose.model('Refill').countDocuments();
    this.refillId = `REF${String(count + 1).padStart(4, '0')}`;
  }
  // Sync requestedDate and scheduledDate
  if (this.requestedDate && !this.scheduledDate) {
    this.scheduledDate = this.requestedDate;
  } else if (this.scheduledDate && !this.requestedDate) {
    this.requestedDate = this.scheduledDate;
  }
  // Sync quantity and cansCount
  if (this.quantity != null && this.cansCount == null) {
    this.cansCount = this.quantity;
  } else if (this.cansCount != null && this.quantity == null) {
    this.quantity = this.cansCount;
  }
});

module.exports = mongoose.model('Refill', refillSchema);

