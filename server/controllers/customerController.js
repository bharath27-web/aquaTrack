const Customer = require('../models/Customer');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Return = require('../models/Return');
const Damage = require('../models/Damage');
const Payment = require('../models/Payment');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Admin
const getCustomers = async (req, res, next) => {
  try {
    const { search, status, city, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (city) query.city = { $regex: city, $options: 'i' };

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: customers,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Admin
const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const deliveries = await Delivery.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('staffId', 'name vehicleNumber');
    const returns = await Return.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(10);
    const damages = await Damage.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(10);
    const payments = await Payment.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: { customer, deliveries, returns, damages, payments },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer (Admin)
// @route   POST /api/customers
// @access  Admin
const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, password, address, city, pincode, canCount, canCapacity, refillFrequency, notes } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !address || !city) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, phone, address, and city' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Normalize email (trim + lowercase) for consistent storage and authentication
    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate User account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // If the User exists but has no linked Customer, link them
      const existingCustomer = await Customer.findOne({ userId: existingUser._id });
      if (!existingCustomer && existingUser.role === 'customer') {
        // Orphaned user — create the customer record and link it
        const nextRefillDate = new Date();
        nextRefillDate.setDate(nextRefillDate.getDate() + (refillFrequency || 7));
        const customer = await Customer.create({
          userId: existingUser._id,
          name: name.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          pincode: pincode?.trim() || '',
          canCount: canCount || 0,
          canCapacity: canCapacity || 20,
          refillFrequency: refillFrequency || 7,
          nextRefillDate,
          notes: notes || '',
        });
        existingUser.customerId = customer._id;
        await existingUser.save();
        return res.status(201).json({
          success: true,
          message: `Customer account linked successfully. ${name} can now log in with email: ${normalizedEmail} and their existing password.`,
          data: customer,
        });
      }
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Also check for orphaned Customer (exists in Customer collection but no User)
    const existingCustomerRecord = await Customer.findOne({ email: normalizedEmail });
    if (existingCustomerRecord) {
      // Check if associated user exists
      const linkedUser = existingCustomerRecord.userId
        ? await User.findById(existingCustomerRecord.userId)
        : null;

      if (!linkedUser) {
        // Create User account for the orphaned customer
        const chosenPassword = (password && password.trim().length >= 6) ? password.trim() : 'aquatrack@123';
        const user = await User.create({
          name: existingCustomerRecord.name,
          email: normalizedEmail,
          phone: existingCustomerRecord.phone,
          password: chosenPassword,
          role: 'customer',
          customerId: existingCustomerRecord._id,
        });
        existingCustomerRecord.userId = user._id;
        await existingCustomerRecord.save();
        return res.status(201).json({
          success: true,
          message: `Authentication account created for existing customer. ${existingCustomerRecord.name} can now log in with email: ${normalizedEmail} and password: ${chosenPassword === 'aquatrack@123' ? 'aquatrack@123 (default)' : '(as set)'}`,
          data: existingCustomerRecord,
        });
      }
      return res.status(400).json({ success: false, message: 'A customer with this email already exists.' });
    }

    // Use provided password or fallback default (min 6 chars for User model)
    const chosenPassword = (password && password.trim().length >= 6) ? password.trim() : 'aquatrack@123';

    // Parse coordinates if provided
    let customerLocation = { lat: null, lng: null, address: address.trim() };
    const reqLoc = req.body.location;
    const reqLat = req.body.lat ?? req.body.latitude ?? reqLoc?.lat ?? reqLoc?.latitude;
    const reqLng = req.body.lng ?? req.body.longitude ?? reqLoc?.lng ?? reqLoc?.longitude;
    if (reqLat !== undefined && reqLat !== null && reqLng !== undefined && reqLng !== null && reqLat !== '' && reqLng !== '') {
      const pLat = Number(reqLat);
      const pLng = Number(reqLng);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        customerLocation = {
          lat: pLat,
          lng: pLng,
          address: reqLoc?.address || address.trim(),
        };
      }
    }

    // Create User account — password is auto-hashed by User model pre-save hook
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: chosenPassword,
      role: 'customer',
    });

    const nextRefillDate = new Date();
    nextRefillDate.setDate(nextRefillDate.getDate() + (refillFrequency || 7));

    // Create Customer document linked to User
    const customer = await Customer.create({
      userId: user._id,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      pincode: pincode?.trim() || '',
      canCount: canCount || 0,
      canCapacity: canCapacity || 20,
      refillFrequency: refillFrequency || 7,
      nextRefillDate,
      location: customerLocation,
      notes: notes || '',
    });

    // Link User → Customer
    user.customerId = customer._id;
    await user.save();

    res.status(201).json({
      success: true,
      message: `Customer account created successfully. ${name} can now log in with email: ${normalizedEmail} and password: ${chosenPassword}`,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Admin / Customer (own)
const updateCustomer = async (req, res, next) => {
  try {
    // Don't allow updating userId or customerId
    const { userId, customerId, ...updateData } = req.body;

    // If email is being updated, normalize it
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }

    // Handle lat/lng passed as top-level fields
    const reqLat = updateData.lat ?? updateData.latitude;
    const reqLng = updateData.lng ?? updateData.longitude;
    if (reqLat !== undefined && reqLat !== null && reqLng !== undefined && reqLng !== null && reqLat !== '' && reqLng !== '') {
      const pLat = Number(reqLat);
      const pLng = Number(reqLng);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        updateData.location = {
          lat: pLat,
          lng: pLng,
          address: updateData.address || updateData.location?.address || '',
        };
      }
    }
    delete updateData.lat;
    delete updateData.lng;
    delete updateData.latitude;
    delete updateData.longitude;

    const customer = await Customer.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    // Sync name/email/phone to the User record too
    if (customer.userId) {
      const syncFields = {};
      if (updateData.name) syncFields.name = updateData.name;
      if (updateData.email) syncFields.email = updateData.email;
      if (updateData.phone) syncFields.phone = updateData.phone;
      if (Object.keys(syncFields).length > 0) {
        await User.findByIdAndUpdate(customer.userId, syncFields);
      }
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/deactivate customer
// @route   DELETE /api/customers/:id
// @access  Admin
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    if (customer.userId) {
      await User.findByIdAndUpdate(customer.userId, { isActive: false });
    }
    res.json({ success: true, message: 'Customer deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync orphaned customers (Admin) — creates missing User accounts for existing customers
// @route   POST /api/customers/sync-auth
// @access  Admin
const syncCustomerAuth = async (req, res, next) => {
  try {
    const allCustomers = await Customer.find({});
    let created = 0;
    let skipped = 0;
    let errors = [];

    for (const customer of allCustomers) {
      try {
        // Check if userId exists and points to a real User
        if (customer.userId) {
          const user = await User.findById(customer.userId);
          if (user) {
            // User exists, ensure customerId is linked back
            if (!user.customerId) {
              await User.findByIdAndUpdate(customer.userId, { customerId: customer._id });
            }
            skipped++;
            continue;
          }
        }

        // No valid User — check by email
        const normalizedEmail = customer.email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
          // Link existing user to customer
          existingUser.customerId = customer._id;
          await existingUser.save();
          customer.userId = existingUser._id;
          await customer.save();
          skipped++;
          continue;
        }

        // Create new User with default password
        const defaultPassword = 'aquatrack@123';
        const newUser = await User.create({
          name: customer.name,
          email: normalizedEmail,
          phone: customer.phone,
          password: defaultPassword,
          role: 'customer',
          customerId: customer._id,
        });

        // Link customer to user
        customer.userId = newUser._id;
        await customer.save();

        created++;
      } catch (err) {
        errors.push({ customer: customer.email, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Sync complete. Created ${created} new auth accounts. Skipped ${skipped} existing.`,
      created,
      skipped,
      errors,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, syncCustomerAuth };
