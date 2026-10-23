const mongoose = require('mongoose');

const damageSchema = new mongoose.Schema({
  damageId: { type: String, unique: true },
  deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  damagedCans: { type: Number, required: true, min: 1 },
  damageReason: {
    type: String,
    enum: ['cracked', 'broken', 'leakage', 'missing_cap', 'physical_damage', 'other'],
    required: true,
  },
  description: { type: String, default: '' },
  photos: [{ type: String }],
  chargePerCan: { type: Number, default: 200 },
  totalCharge: { type: Number, default: 0 },
  status: { type: String, enum: ['reported', 'reviewed', 'approved', 'rejected'], default: 'reported' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNotes: { type: String, default: '' },
  reportedAt: { type: Date, default: Date.now },
}, { timestamps: true });

damageSchema.pre('save', async function() {
  if (!this.damageId) {
    const count = await mongoose.model('Damage').countDocuments();
    this.damageId = `DMG${String(count + 1).padStart(4, '0')}`;
  }
  if (this.isModified('damagedCans') || this.isModified('chargePerCan')) {
    this.totalCharge = this.damagedCans * this.chargePerCan;
  }
});

module.exports = mongoose.model('Damage', damageSchema);
