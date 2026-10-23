const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Staff = require('../models/Staff');
const User = require('../models/User');

router.use(protect);

// Get all staff
router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { staffId: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    const total = await Staff.countDocuments(query);
    const staff = await Staff.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ success: true, data: staff, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Get active staff locations (for admin map) - must be defined before /:id
router.get('/active/locations', authorize('admin'), async (req, res, next) => {
  try {
    const staff = await Staff.find({
      isOnDuty: true,
      'currentLocation.lat': { $ne: null },
    }).select('name vehicleNumber vehicleType currentLocation isOnDelivery staffId status');
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
});

// Get current staff's own profile - must be defined before /:id
router.get('/me', async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff profile not found' });
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
});

// Get single staff
router.get('/:id', authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
});

// Create staff
router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { name, email, phone, password, vehicleNumber, vehicleType, lat, lng, latitude, longitude, currentLocation, location } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    let parsedLat = null;
    let parsedLng = null;
    if (currentLocation && (currentLocation.lat != null || currentLocation.latitude != null)) {
      parsedLat = Number(currentLocation.lat ?? currentLocation.latitude);
      parsedLng = Number(currentLocation.lng ?? currentLocation.longitude);
    } else if (location && (location.lat != null || location.latitude != null)) {
      parsedLat = Number(location.lat ?? location.latitude);
      parsedLng = Number(location.lng ?? location.longitude);
    } else if ((lat != null && lat !== '') || (latitude != null && latitude !== '')) {
      parsedLat = Number(lat ?? latitude);
      parsedLng = Number(lng ?? longitude);
    }

    const hasCoords = typeof parsedLat === 'number' && typeof parsedLng === 'number' && !isNaN(parsedLat) && !isNaN(parsedLng);

    const user = await User.create({
      name: name ? name.trim() : '',
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password: password || 'aquatrack@123',
      role: 'staff'
    });

    const staff = await Staff.create({
      userId: user._id,
      name: name ? name.trim() : '',
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      vehicleNumber: vehicleNumber ? vehicleNumber.trim() : '',
      vehicleType: vehicleType || 'van',
      currentLocation: hasCoords ? { lat: parsedLat, lng: parsedLng, updatedAt: new Date() } : { lat: null, lng: null, updatedAt: null },
      isOnDuty: hasCoords,
    });
    user.staffId = staff._id;
    await user.save();
    res.status(201).json({ success: true, data: staff });
  } catch (error) { next(error); }
});

// Update staff
router.put('/:id', authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    const reqLat = updateData.lat ?? updateData.latitude;
    const reqLng = updateData.lng ?? updateData.longitude;
    if (reqLat !== undefined && reqLat !== null && reqLng !== undefined && reqLng !== null && reqLat !== '' && reqLng !== '') {
      const pLat = Number(reqLat);
      const pLng = Number(reqLng);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        updateData.currentLocation = {
          lat: pLat,
          lng: pLng,
          updatedAt: new Date(),
        };
        updateData.isOnDuty = true;
      }
    }
    delete updateData.lat;
    delete updateData.lng;
    delete updateData.latitude;
    delete updateData.longitude;

    const staff = await Staff.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
});

module.exports = router;

