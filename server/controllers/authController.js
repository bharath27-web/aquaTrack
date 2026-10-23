const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// @desc    Register user (Customer only)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, address, city } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    // Public registration creates Customer accounts only
    const role = 'customer';
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      role,
    });

    const customer = await Customer.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: address?.trim() || 'Address pending update',
      city: city?.trim() || 'Pending',
    });

    user.customerId = customer._id;
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        customerId: user.customerId,
        profile: customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Role verification: normalize to lowercase before comparing
    if (role) {
      const normalizedRole = role.trim().toLowerCase();
      if (user.role !== normalizedRole) {
        return res.status(403).json({
          success: false,
          message: `These credentials are not associated with the ${normalizedRole} role.`
        });
      }
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    let profileData = null;
    if (user.role === 'customer') {
      profileData = await Customer.findOne({ userId: user._id });
    } else if (user.role === 'staff') {
      profileData = await Staff.findOne({ userId: user._id });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        customerId: user.customerId,
        staffId: user.staffId,
        profile: profileData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let profileData = null;
    if (user.role === 'customer') {
      profileData = await Customer.findOne({ userId: user._id });
    } else if (user.role === 'staff') {
      profileData = await Staff.findOne({ userId: user._id });
    }
    res.json({
      success: true,
      user: { ...user.toJSON(), profile: profileData },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { register, login, getMe, logout };
