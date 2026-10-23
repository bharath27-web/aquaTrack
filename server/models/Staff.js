const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  vehicleNumber: { type: String, trim: true },
  vehicleType: { type: String, enum: ['bike', 'auto', 'van', 'truck'], default: 'van' },
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null },
  },
  isOnDuty: { type: Boolean, default: false },
  isOnDelivery: { type: Boolean, default: false },
  currentDeliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', default: null },
  totalDeliveries: { type: Number, default: 0 },
  completedDeliveries: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });

staffSchema.pre('save', async function() {
  if (!this.staffId) {
    const count = await mongoose.model('Staff').countDocuments();
    this.staffId = `STAFF${String(count + 1).padStart(3, '0')}`;
  }
});

module.exports = mongoose.model('Staff', staffSchema);
