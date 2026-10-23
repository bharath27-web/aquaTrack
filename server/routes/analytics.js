const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Delivery = require('../models/Delivery');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Damage = require('../models/Damage');
const Return = require('../models/Return');
const Payment = require('../models/Payment');

router.use(protect, authorize('admin'));

// Dashboard summary
router.get('/dashboard', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [
      totalCustomers, activeCustomers,
      todayDeliveries, pendingDeliveries, completedDeliveries,
      activeStaff, totalDamages, monthDamages,
      pendingRefillsCount,
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'active' }),
      Delivery.countDocuments({ scheduledDate: { $gte: today, $lt: tomorrow }, status: { $nin: ['cancelled'] } }),
      Delivery.countDocuments({ status: 'pending' }),
      Delivery.countDocuments({ status: 'delivered' }),
      Staff.countDocuments({ isOnDuty: true }),
      Damage.countDocuments(),
      Damage.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Delivery.countDocuments({ status: 'pending' }),
    ]);

    // Delivery stats for chart (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const count = await Delivery.countDocuments({
        scheduledDate: { $gte: date, $lt: nextDate },
        status: 'delivered',
      });
      last7Days.push({
        date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        deliveries: count,
      });
    }

    // Revenue this month
    const monthPayments = await Payment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthRevenue = monthPayments[0]?.total || 0;

    // Damage cost
    const damageCost = await Damage.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$totalCharge' } } },
    ]);

    res.json({
      success: true,
      data: {
        kpi: {
          totalCustomers, activeCustomers,
          todayDeliveries, pendingDeliveries, completedDeliveries,
          activeStaff, totalDamages, monthDamages,
          pendingRefillsCount, monthRevenue,
          damageCost: damageCost[0]?.total || 0,
        },
        deliveryChart: last7Days,
      },
    });
  } catch (error) { next(error); }
});

// Delivery analytics
router.get('/deliveries', async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let days = period === 'month' ? 30 : period === 'year' ? 365 : 7;

    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [delivered, pending, cancelled] = await Promise.all([
        Delivery.countDocuments({ scheduledDate: { $gte: date, $lt: nextDate }, status: 'delivered' }),
        Delivery.countDocuments({ scheduledDate: { $gte: date, $lt: nextDate }, status: { $in: ['pending', 'assigned'] } }),
        Delivery.countDocuments({ scheduledDate: { $gte: date, $lt: nextDate }, status: 'cancelled' }),
      ]);

      chartData.push({
        date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        delivered, pending, cancelled,
      });
    }

    // Status breakdown
    const statuses = ['pending', 'assigned', 'on_the_way', 'arrived', 'delivered', 'failed', 'cancelled'];
    const statusBreakdown = {};
    for (const s of statuses) {
      statusBreakdown[s] = await Delivery.countDocuments({ status: s });
    }

    res.json({ success: true, data: { chartData, statusBreakdown } });
  } catch (error) { next(error); }
});

// Customer analytics
router.get('/customers', async (req, res, next) => {
  try {
    const topCustomers = await Delivery.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: '$customerId', totalDeliveries: { $sum: 1 }, totalCans: { $sum: '$cansDelivered' } } },
      { $sort: { totalDeliveries: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      { $project: { name: '$customer.name', totalDeliveries: 1, totalCans: 1 } },
    ]);
    res.json({ success: true, data: { topCustomers } });
  } catch (error) { next(error); }
});

// Damage analytics
router.get('/damages', async (req, res, next) => {
  try {
    const byReason = await Damage.aggregate([
      { $group: { _id: '$damageReason', count: { $sum: 1 }, totalCans: { $sum: '$damagedCans' }, totalCharge: { $sum: '$totalCharge' } } },
      { $sort: { count: -1 } },
    ]);

    const topAffected = await Damage.aggregate([
      { $group: { _id: '$customerId', totalDamages: { $sum: '$damagedCans' }, totalCharge: { $sum: '$totalCharge' } } },
      { $sort: { totalDamages: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      { $project: { name: '$customer.name', totalDamages: 1, totalCharge: 1 } },
    ]);

    res.json({ success: true, data: { byReason, topAffected } });
  } catch (error) { next(error); }
});

module.exports = router;
