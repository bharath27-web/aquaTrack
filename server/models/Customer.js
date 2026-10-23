const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    address: { type: String, default: null },
  },
  canCount: { type: Number, default: 0 },
  canCapacity: { type: Number, default: 20, enum: [10, 20] },
  refillFrequency: { type: Number, default: 7, comment: 'in days' },
  nextRefillDate: { type: Date, default: null },
  lastDeliveryDate: { type: Date, default: null },
  outstandingBalance: { type: Number, default: 0 },
  totalDeliveries: { type: Number, default: 0 },
  totalReturns: { type: Number, default: 0 },
  totalDamagedCans: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  notes: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });

customerSchema.pre('save', async function() {
  if (!this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CUST${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Customer', customerSchema);
