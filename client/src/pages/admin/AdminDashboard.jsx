import React, { useState, useEffect } from 'react';
import {
  Users, Truck, Clock, UserCheck, AlertTriangle, RefreshCw, TrendingUp, Activity,
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { analyticsAPI, deliveryAPI, customerAPI, staffAPI } from '../../services/api';
import StatCard from '../../components/StatCard';
import PageHeader from '../../components/PageHeader';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import StatusBadge from '../../components/StatusBadge';
import MapView from '../../components/MapView';
import { useSocket } from '../../context/SocketContext';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [dbStaff, setDbStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const { staffLocations } = useSocket();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, deliveriesRes, staffRes, customerRes] = await Promise.all([
        analyticsAPI.dashboard(),
        deliveryAPI.getAll({ limit: 5, page: 1 }),
        staffAPI.getAll({ limit: 20 }),
        customerAPI.getAll({ limit: 30 }),
      ]);
      setData(dashboardRes.data);
      setRecentDeliveries(deliveriesRes.data || []);
      setDbStaff(staffRes.data || []);
      setCustomers(customerRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const kpi = data?.kpi || {};

  // Build map markers from DB staff merged with real-time socket locations + customers
  const mapMarkers = React.useMemo(() => {
    const map = {};
    dbStaff.forEach((s) => {
      if (s.currentLocation?.lat && s.currentLocation?.lng) {
        map[`staff-${s._id}`] = {
          id: `staff-${s._id}`,
          type: 'staff',
          role: 'staff',
          lat: s.currentLocation.lat,
          lng: s.currentLocation.lng,
          title: s.name,
          subtitle: `Chennai &bull; ${s.vehicleNumber || 'Van'}`,
          phone: s.phone,
          vehicleNumber: s.vehicleNumber || 'N/A',
          vehicleType: s.vehicleType || 'van',
          status: s.isOnDelivery ? 'on_the_way' : 'on_duty',
          color: s.isOnDelivery ? 'orange' : 'green',
          deliveryStatus: s.isOnDelivery ? 'Out for Delivery' : 'Available',
          badge: '🚚',
        };
      }
    });

    Object.values(staffLocations).forEach((s) => {
      const id = s.staffId || s.id;
      if (s.location?.lat && s.location?.lng) {
        map[`staff-${id}`] = {
          id: `staff-${id}`,
          type: 'staff',
          role: 'staff',
          lat: s.location.lat,
          lng: s.location.lng,
          title: s.staffName || map[`staff-${id}`]?.title || 'Staff Member',
          subtitle: `Live Telemetry`,
          phone: s.phone || map[`staff-${id}`]?.phone,
          vehicleNumber: s.vehicleNumber || map[`staff-${id}`]?.vehicleNumber || 'N/A',
          vehicleType: map[`staff-${id}`]?.vehicleType || 'van',
          status: s.isOnDelivery ? 'on_the_way' : 'on_duty',
          color: s.isOnDelivery ? 'orange' : 'green',
          deliveryStatus: s.isOnDelivery ? 'Out for Delivery' : 'Available',
          badge: '🚚',
        };
      }
    });

    // Customer markers
    const customerMarkers = customers
      .filter((c) => c.location?.lat && c.location?.lng)
      .map((c) => ({
        id: `cust-${c._id}`,
        type: 'customer',
        role: 'customer',
        lat: c.location.lat,
        lng: c.location.lng,
        title: c.name,
        subtitle: `${c.address}, Chennai`,
        phone: c.phone,
        address: c.address,
        canCount: c.canCount,
        nextRefillDate: c.nextRefillDate,
        color: 'blue',
        badge: '💧',
      }));

    return [...Object.values(map), ...customerMarkers];
  }, [dbStaff, staffLocations, customers]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening with your business today."
        actions={
          <button onClick={fetchDashboard} className="btn-secondary text-sm">
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Customers" value={kpi.totalCustomers} icon={Users} color="blue" trendLabel={`${kpi.activeCustomers} active`} loading={loading} />
        <StatCard title="Today's Deliveries" value={kpi.todayDeliveries} icon={Truck} color="cyan" trendLabel="Scheduled today" loading={loading} />
        <StatCard title="Pending" value={kpi.pendingDeliveries} icon={Clock} color="yellow" trendLabel="Awaiting assignment" loading={loading} />
        <StatCard title="Active Staff" value={kpi.activeStaff} icon={UserCheck} color="green" trendLabel="Currently on duty" loading={loading} />
        <StatCard title="Damaged Cans" value={kpi.totalDamages} icon={AlertTriangle} color="red" trendLabel={`${kpi.monthDamages} this month`} loading={loading} />
        <StatCard title="Revenue (Month)" value={formatCurrency(kpi.monthRevenue)} icon={TrendingUp} color="purple" trendLabel="Payments received" loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Trend Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="section-title">Delivery Performance</h2>
              <p className="text-xs text-muted mt-0.5">Last 7 days completed deliveries</p>
            </div>
            <div className="p-2 bg-primary-50 rounded-lg">
              <Activity size={18} className="text-primary-700" />
            </div>
          </div>
          {loading ? (
            <div className="skeleton h-48 rounded-lg"></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.deliveryChart || []}>
                <defs>
                  <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F4C81" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0F4C81" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="deliveries" stroke="#0F4C81" strokeWidth={2.5} fill="url(#colorDeliveries)" dot={{ r: 3, fill: '#0F4C81' }} name="Deliveries" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Delivery Status Breakdown */}
        <div className="card">
          <h2 className="section-title mb-5">Delivery Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Delivered', value: kpi.completedDeliveries, color: 'bg-success', text: 'text-success' },
              { label: 'Pending', value: kpi.pendingDeliveries, color: 'bg-warning', text: 'text-warning' },
              { label: 'Today', value: kpi.todayDeliveries, color: 'bg-primary-600', text: 'text-primary-700' },
            ].map((item) => {
              const total = (kpi.completedDeliveries || 0) + (kpi.pendingDeliveries || 0) + 1;
              const pct = Math.round(((item.value || 0) / total) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted">{item.label}</span>
                    <span className={`font-semibold ${item.text}`}>{loading ? '—' : item.value || 0}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: loading ? '0%' : `${Math.min(pct, 100)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Map */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">Live Chennai Operations Map</h2>
            <p className="text-xs text-muted mt-0.5">
              {mapMarkers.length > 0 ? `${mapMarkers.length} active units & customer locations mapped` : 'Connecting to fleet...'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Staff (Available)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Active Delivery</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-sky-600"></div> Customer</div>
          </div>
        </div>
        <MapView height="380px" markers={mapMarkers} zoom={11} />
      </div>

      {/* Recent Deliveries */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Deliveries</h2>
          <a href="/admin/deliveries" className="text-sm text-primary-700 hover:underline">View all</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header rounded-tl-lg">Delivery ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Staff</th>
                <th className="table-header">Date</th>
                <th className="table-header">Cans</th>
                <th className="table-header rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded"></div></td>)}
                  </tr>
                ))
              ) : recentDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted text-sm">No deliveries yet</td>
                </tr>
              ) : (
                recentDeliveries.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell font-mono text-xs text-primary-700">{d.deliveryId}</td>
                    <td className="table-cell font-medium">{d.customerId?.name || 'N/A'}</td>
                    <td className="table-cell text-muted">{d.staffId?.name || 'Unassigned'}</td>
                    <td className="table-cell text-muted text-xs">{new Date(d.scheduledDate).toLocaleDateString('en-IN')}</td>
                    <td className="table-cell"><span className="font-medium">{d.cansOrdered}</span></td>
                    <td className="table-cell"><StatusBadge status={d.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
