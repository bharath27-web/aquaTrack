require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Customer = require('./models/Customer');
const Staff = require('./models/Staff');
const Delivery = require('./models/Delivery');
const Return = require('./models/Return');
const Damage = require('./models/Damage');
const Refill = require('./models/Refill');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany(), Customer.deleteMany(), Staff.deleteMany(),
    Delivery.deleteMany(), Return.deleteMany(), Damage.deleteMany(),
    Refill.deleteMany(), Payment.deleteMany(), Notification.deleteMany(),
  ]);
  console.log('🗑️  Cleared all collections');

  // Create Admin
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@aquatrack.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminUser = await User.create({
    name: 'AquaTrack Administrator',
    email: adminEmail,
    phone: '9876543210',
    password: adminPassword,
    role: 'admin',
  });
  console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`);

  // Create Staff with real Chennai base locations
  const staffData = [
    {
      name: 'Arun Kumar',
      email: 'arun@aquatrack.com',
      phone: '9876543211',
      vehicleNumber: 'TN-09-AB-1234',
      vehicleType: 'van',
      currentLocation: { lat: 13.0835, lng: 80.2720, updatedAt: new Date() }, // Central Chennai
      isOnDuty: true,
      isOnDelivery: true,
    },
    {
      name: 'Vijay Selvam',
      email: 'vijay@aquatrack.com',
      phone: '9876543212',
      vehicleNumber: 'TN-09-CD-5678',
      vehicleType: 'van',
      currentLocation: { lat: 12.9815, lng: 80.2180, updatedAt: new Date() }, // South Chennai (Velachery hub)
      isOnDuty: true,
      isOnDelivery: false,
    },
    {
      name: 'Suresh Babu',
      email: 'suresh@aquatrack.com',
      phone: '9876543213',
      vehicleNumber: 'TN-09-EF-9012',
      vehicleType: 'auto',
      currentLocation: { lat: 13.0368, lng: 80.1565, updatedAt: new Date() }, // West Chennai (Porur hub)
      isOnDuty: true,
      isOnDelivery: false,
    },
  ];

  const staffUsers = [];
  const staffDocs = [];
  for (const s of staffData) {
    const user = await User.create({ name: s.name, email: s.email, phone: s.phone, password: 'staff123', role: 'staff' });
    const staff = await Staff.create({
      userId: user._id,
      ...s,
      totalDeliveries: Math.floor(Math.random() * 200) + 50,
      completedDeliveries: Math.floor(Math.random() * 180) + 40,
      averageRating: (Math.random() * 1.5 + 3.5).toFixed(1),
    });
    user.staffId = staff._id;
    await user.save();
    staffUsers.push(user);
    staffDocs.push(staff);
  }
  console.log('✅ Staff created: arun@aquatrack.com, vijay@aquatrack.com, suresh@aquatrack.com / staff123');

  // Create Customers with precise Chennai area coordinates
  const customerData = [
    { name: 'Ravi Kumar', email: 'ravi@example.com', phone: '9876501001', address: '12, Anna Nagar Main Road', city: 'Chennai', canCount: 3, refillFrequency: 7, lat: 13.0850, lng: 80.2101 }, // Anna Nagar (North-Central)
    { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876501002', address: '45, Usman Road, T Nagar', city: 'Chennai', canCount: 5, refillFrequency: 14, lat: 13.0418, lng: 80.2341 }, // T Nagar (Central)
    { name: 'Suresh Mohan', email: 'suresh.m@example.com', phone: '9876501003', address: '78, Bypass Road, Velachery', city: 'Chennai', canCount: 2, refillFrequency: 7, lat: 12.9759, lng: 80.2212 }, // Velachery (South)
    { name: 'Deepa Nair', email: 'deepa@example.com', phone: '9876501004', address: '23, Gandhi Nagar, Adyar', city: 'Chennai', canCount: 6, refillFrequency: 10, lat: 13.0012, lng: 80.2565 }, // Adyar (South)
    { name: 'Manoj Patel', email: 'manoj@example.com', phone: '9876501005', address: '56, GST Road, Tambaram', city: 'Chennai', canCount: 4, refillFrequency: 7, lat: 12.9249, lng: 80.1264 }, // Tambaram (Southwest)
    { name: 'Kavitha Reddy', email: 'kavitha@example.com', phone: '9876501006', address: '89, IT Corridor, OMR Road', city: 'Chennai', canCount: 8, refillFrequency: 7, lat: 12.9279, lng: 80.2301 }, // OMR Road (South)
    { name: 'Anand Krishnan', email: 'anand@example.com', phone: '9876501007', address: '34, Mount Poonamallee Rd, Porur', city: 'Chennai', canCount: 3, refillFrequency: 14, lat: 13.0382, lng: 80.1565 }, // Porur (West)
    { name: 'Meena Iyer', email: 'meena@example.com', phone: '9876501008', address: '67, Industrial Estate, Guindy', city: 'Chennai', canCount: 5, refillFrequency: 7, lat: 13.0067, lng: 80.2024 }, // Guindy (South-Central)
    { name: 'Ramesh Babu', email: 'ramesh@example.com', phone: '9876501009', address: '90, Tech Park, Sholinganallur', city: 'Chennai', canCount: 2, refillFrequency: 10, lat: 12.9010, lng: 80.2279 }, // Sholinganallur (OMR/South)
    { name: 'Nithya Menon', email: 'nithya@example.com', phone: '9876501010', address: '11, Station Road, Chromepet', city: 'Chennai', canCount: 7, refillFrequency: 7, lat: 12.9516, lng: 80.1462 }, // Chromepet (South)
  ];

  const customerDocs = [];
  const customerUserDocs = [];
  for (const c of customerData) {
    const user = await User.create({ name: c.name, email: c.email, phone: c.phone, password: 'customer123', role: 'customer' });
    const nextRefill = new Date();
    nextRefill.setDate(nextRefill.getDate() + c.refillFrequency);
    const customer = await Customer.create({
      userId: user._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      canCount: c.canCount,
      refillFrequency: c.refillFrequency,
      location: { lat: c.lat, lng: c.lng, address: c.address },
      nextRefillDate: nextRefill,
      outstandingBalance: Math.floor(Math.random() * 1000),
      totalDeliveries: Math.floor(Math.random() * 30) + 5,
      joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    });
    user.customerId = customer._id;
    await user.save();
    customerDocs.push(customer);
    customerUserDocs.push(user);
  }
  console.log('✅ 10 Chennai customers created: ravi@example.com (etc.) / customer123');

  // Create Deliveries (last 30 days)
  const deliveryStatuses = ['delivered', 'delivered', 'delivered', 'pending', 'assigned', 'cancelled'];
  const deliveryDocs = [];
  for (let i = 0; i < 25; i++) {
    const customer = customerDocs[i % customerDocs.length];
    const staff = staffDocs[i % staffDocs.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const status = deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)];
    const cansOrdered = Math.floor(Math.random() * 5) + 1;
    const amount = cansOrdered * 60;

    const delivery = await Delivery.create({
      customerId: customer._id,
      staffId: staff._id,
      scheduledDate: date,
      cansOrdered,
      cansDelivered: status === 'delivered' ? cansOrdered : 0,
      cansReturned: status === 'delivered' ? Math.max(0, cansOrdered - 1) : 0,
      deliveryAddress: `${customer.address}, ${customer.city}`,
      deliveryLocation: customer.location,
      status,
      amount,
      totalAmount: amount,
      paymentStatus: status === 'delivered' ? 'paid' : 'pending',
      deliveredAt: status === 'delivered' ? date : null,
    });
    deliveryDocs.push(delivery);

    if (status === 'delivered') {
      await Return.create({
        deliveryId: delivery._id, customerId: customer._id, staffId: staff._id,
        cansDelivered: cansOrdered, cansReturned: Math.max(0, cansOrdered - 1),
        returnedAt: date,
      });

      await Payment.create({
        customerId: customer._id, deliveryId: delivery._id,
        amount, type: 'delivery', method: ['cash', 'upi', 'bank_transfer'][i % 3],
        status: 'completed', paidAt: date,
      });
    }
  }

  // Today's deliveries
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    await Delivery.create({
      customerId: customerDocs[i]._id,
      staffId: staffDocs[i % 3]._id,
      scheduledDate: today,
      cansOrdered: Math.floor(Math.random() * 4) + 2,
      deliveryAddress: `${customerDocs[i].address}, ${customerDocs[i].city}`,
      deliveryLocation: customerDocs[i].location,
      status: i === 0 ? 'on_the_way' : i === 1 ? 'assigned' : 'pending',
      amount: 180,
    });
  }

  // Damage reports
  const damageReasons = ['cracked', 'broken', 'leakage', 'missing_cap', 'physical_damage'];
  for (let i = 0; i < 5; i++) {
    const delivery = deliveryDocs[i];
    const customer = customerDocs[i];
    const staff = staffDocs[i % 3];
    await Damage.create({
      deliveryId: delivery._id, customerId: customer._id, staffId: staff._id,
      damagedCans: Math.floor(Math.random() * 2) + 1,
      damageReason: damageReasons[i % damageReasons.length],
      description: 'Can was found damaged during delivery.',
      chargePerCan: 200,
      totalCharge: (Math.floor(Math.random() * 2) + 1) * 200,
      status: i < 3 ? 'approved' : 'reported',
    });
  }

  // Refill schedules
  for (const customer of customerDocs) {
    const dueDate = new Date(customer.nextRefillDate);
    await Refill.create({
      customerId: customer._id,
      scheduledDate: dueDate,
      cansCount: customer.canCount || 3,
      status: dueDate < new Date() ? 'due' : 'scheduled',
    });
  }

  // Notifications
  const notifMessages = [
    { title: 'Delivery Assigned', message: 'Your delivery has been assigned to Arun Kumar.', type: 'delivery_assigned' },
    { title: 'Refill Due Tomorrow', message: 'Your water can refill is due tomorrow.', type: 'refill_due' },
    { title: 'Delivery Completed', message: 'Your delivery has been completed successfully.', type: 'delivery_completed' },
  ];
  for (const customerUser of customerUserDocs.slice(0, 3)) {
    for (const msg of notifMessages) {
      await Notification.create({ userId: customerUser._id, ...msg });
    }
  }

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 DEMO LOGIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 ADMIN   : admin@aquatrack.com     | admin123');
  console.log('🚚 STAFF 1 : arun@aquatrack.com      | staff123');
  console.log('🚚 STAFF 2 : vijay@aquatrack.com     | staff123');
  console.log('👤 CUSTOMER: ravi@example.com         | customer123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
