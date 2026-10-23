const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  returnId: { type: String, unique: true },
  deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  cansDelivered: { type: Number, required: true },
  cansReturned: { type: Number, required: true },
  cansPending: { type: Number, default: 0 },
  returnedAt: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['partial', 'complete'], default: 'complete' },
}, { timestamps: true });

returnSchema.pre('save', async function() {
  if (!this.returnId) {
    const count = await mongoose.model('Return').countDocuments();
    this.returnId = `RET${String(count + 1).padStart(4, '0')}`;
  }
  this.cansPending = this.cansDelivered - this.cansReturned;
  this.status = this.cansPending <= 0 ? 'complete' : 'partial';
});

module.exports = mongoose.model('Return', returnSchema);
