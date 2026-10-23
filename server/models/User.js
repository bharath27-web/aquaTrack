const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'staff', 'customer'], required: true },
  avatar: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  // Customer-specific
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  // Staff-specific
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
