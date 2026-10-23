import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { deliveryAPI, locationAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import MapView from '../../components/MapView';
import Modal from '../../components/Modal';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  Package,
  Navigation,
  Wifi,
  WifiOff,
  Phone,
  Calendar,
  AlertCircle,
} from 'lucide-react';

const CHENNAI_DEFAULT = { lat: 13.0827, lng: 80.2707 };

const StaffDashboard = () => {
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState(null);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    totalCansDelivered: 0,
  });
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [completeModal, setCompleteModal] = useState({ open: false, delivery: null });
  const [completeForm, setCompleteForm] = useState({ cansDelivered: 0, cansReturned: 0, notes: '' });
  const [trackingActive, setTrackingActive] = useState(false);
  const [currentGps, setCurrentGps] = useState(null);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const { user } = useAuth();
  const { emit, on, connected } = useSocket();

  const fetchToday = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [todayRes, statsRes] = await Promise.all([
        deliveryAPI.getToday(),
        deliveryAPI.getStats().catch((err) => {
          console.warn('Failed to fetch separate delivery stats, falling back to todayRes stats:', err);
          return null;
        }),
      ]);

      const deliveries = todayRes?.data || [];
      setTodayDeliveries(deliveries);
      setStaff(todayRes?.staff);

      const serverStats = statsRes?.data || todayRes?.stats;
      if (serverStats) {
        setStats({
          totalAssigned: serverStats.totalAssigned ?? deliveries.length,
          pending: serverStats.pending ?? 0,
          inProgress: serverStats.inProgress ?? 0,
          completed: serverStats.completed ?? 0,
          totalCansDelivered: serverStats.totalCansDelivered ?? 0,
        });
      } else {
        const completed = deliveries.filter((d) => d.status === 'delivered');
        const inProg = deliveries.filter((d) => ['on_the_way', 'out_for_delivery', 'arrived'].includes(d.status));
        const pend = deliveries.filter((d) => ['pending', 'assigned'].includes(d.status));
        const cans = completed.reduce((sum, d) => sum + (d.cansDelivered || 0), 0);
        setStats({
          totalAssigned: deliveries.length,
          pending: pend.length,
          inProgress: inProg.length,
          completed: completed.length,
          totalCansDelivered: cans,
        });
      }

      // Check if an in-progress delivery exists
      const inProgress = deliveries.find((d) => ['on_the_way', 'out_for_delivery', 'arrived'].includes(d.status));
      if (inProgress) {
        setActiveDelivery(inProgress);
      } else {
        setActiveDelivery(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  // Real-time synchronization through Socket.IO
  useEffect(() => {
    if (!on) return;
    const unsubUpdate = on('deliveryStatusUpdate', () => {
      fetchToday();
    });
    const unsubCompleted = on('deliveryCompleted', () => {
      fetchToday();
    });
    return () => {
      if (unsubUpdate) unsubUpdate();
      if (unsubCompleted) unsubCompleted();
    };
  }, [on, fetchToday]);

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device. Using stored location.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentGps({ lat, lng });
        emit('updateLocation', { lat, lng });
        locationAPI.update({ lat, lng }).catch(() => {});
      },
      (err) => {
        console.warn('Location permission denied or unavailable:', err.message);
        toast('Using stored Chennai depot coordinates', { icon: '📍' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    setLocationWatcher(watchId);
    setTrackingActive(true);
    toast.success('Live GPS tracking enabled');
  };

  const stopTracking = () => {
    if (locationWatcher) navigator.geolocation.clearWatch(locationWatcher);
    setLocationWatcher(null);
    setTrackingActive(false);
    emit('goOffDuty');
    toast('Location tracking stopped');
  };

  const startDelivery = async (delivery) => {
    try {
      await deliveryAPI.update(delivery._id, { status: 'on_the_way' });
      setActiveDelivery(delivery);
      if (!trackingActive) startLocationTracking();
      toast.success(`En route to ${delivery.customerId?.name}`);
      fetchToday();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const markArrived = async (delivery) => {
    try {
      await deliveryAPI.update(delivery._id, { status: 'arrived' });
      toast.success('Arrived at customer location!');
      fetchToday();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openComplete = (delivery) => {
    setCompleteModal({ open: true, delivery });
    setCompleteForm({
      cansDelivered: delivery.cansOrdered,
      cansReturned: Math.max(0, delivery.cansOrdered - 1),
      notes: '',
    });
  };

  const completeDelivery = async () => {
    try {
      const { delivery } = completeModal;
      await deliveryAPI.update(delivery._id, {
        status: 'delivered',
        cansDelivered: completeForm.cansDelivered,
        cansReturned: completeForm.cansReturned,
        notes: completeForm.notes,
      });
      toast.success('Delivery marked as completed! 🎉');
      setCompleteModal({ open: false, delivery: null });
      if (activeDelivery?._id === delivery._id) setActiveDelivery(null);
      await fetchToday();
    } catch (err) {
      toast.error(err.message || 'Failed to complete delivery');
    }
  };

  // Staff effective position: live GPS or fallback to stored DB coordinates
  const staffPosition = useMemo(() => {
    if (currentGps) return currentGps;
    if (staff?.currentLocation?.lat && staff?.currentLocation?.lng) {
      return { lat: staff.currentLocation.lat, lng: staff.currentLocation.lng };
    }
    return CHENNAI_DEFAULT;
  }, [currentGps, staff]);

  // Construct map markers for this specific staff member
  const mapMarkers = useMemo(() => {
    const list = [];

    // 1. Staff current location marker (Green)
    list.push({
      id: `staff-${staff?._id || 'me'}`,
      type: 'staff',
      role: 'staff',
      lat: staffPosition.lat,
      lng: staffPosition.lng,
      title: `${staff?.name || user?.name || 'Staff'} (You)`,
      subtitle: `${staff?.vehicleNumber || 'Van'} &bull; ${trackingActive ? 'Live GPS' : 'Stored Location'}`,
      phone: staff?.phone || user?.phone,
      vehicleNumber: staff?.vehicleNumber || 'Van',
      vehicleType: staff?.vehicleType || 'van',
      status: activeDelivery ? 'on_the_way' : 'on_duty',
      color: 'green',
    });

    // 2. Assigned customer destination markers ONLY
    todayDeliveries.forEach((d) => {
      const cust = d.customerId;
      if (cust?.location?.lat && cust?.location?.lng) {
        const isActive = activeDelivery?._id === d._id;
        list.push({
          id: `cust-${d._id}`,
          type: 'customer',
          role: 'customer',
          lat: cust.location.lat,
          lng: cust.location.lng,
          title: cust.name,
          subtitle: `${cust.address}, ${cust.city || 'Chennai'}`,
          phone: cust.phone,
          canCount: d.cansOrdered,
          nextRefillDate: cust.nextRefillDate,
          status: d.status,
          color: isActive ? 'orange' : d.status === 'delivered' ? 'green' : 'blue',
          info: {
            'Cans Ordered': `${d.cansOrdered} cans`,
            'Scheduled Time': d.scheduledDate ? formatDate(d.scheduledDate) : 'Today',
            Address: d.deliveryAddress || cust.address,
          },
        });
      }
    });

    return list;
  }, [staffPosition, staff, user, trackingActive, activeDelivery, todayDeliveries]);

  // Calculate route from staff to active delivery customer
  const deliveryRoute = useMemo(() => {
    if (!activeDelivery) return null;
    const custLoc = activeDelivery.customerId?.location;
    if (custLoc?.lat && custLoc?.lng && staffPosition?.lat && staffPosition?.lng) {
      return {
        origin: { lat: staffPosition.lat, lng: staffPosition.lng },
        destination: { lat: custLoc.lat, lng: custLoc.lng },
      };
    }
    return null;
  }, [activeDelivery, staffPosition]);

  const pendingDeliveries = todayDeliveries.filter((d) =>
    ['pending', 'assigned'].includes(d.status)
  );
  const inProgressDeliveries = todayDeliveries.filter((d) =>
    ['on_the_way', 'arrived'].includes(d.status)
  );
  const completedDeliveries = todayDeliveries.filter((d) => d.status === 'delivered');

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]}!`}
        subtitle="Manage your assigned Chennai delivery routes and drop-offs"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={trackingActive ? stopTracking : startLocationTracking}
              className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm ${
                trackingActive
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-[#0284C7] text-white hover:bg-[#0369a1]'
              }`}
            >
              {trackingActive ? <WifiOff size={15} /> : <Wifi size={15} />}
              {trackingActive ? 'Stop Live GPS' : 'Enable Live GPS'}
            </button>
          </div>
        }
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button onClick={fetchToday} className="underline font-semibold hover:text-rose-900">Retry</button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="card text-center py-3.5">
          <p className="text-2xl font-bold text-[#0284C7]">{statsLoading ? '—' : stats.totalAssigned}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Total Assigned</p>
        </div>
        <div className="card text-center py-3.5">
          <p className="text-2xl font-bold text-amber-500">{statsLoading ? '—' : stats.pending}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Pending Delivery</p>
        </div>
        <div className="card text-center py-3.5">
          <p className="text-2xl font-bold text-blue-600">{statsLoading ? '—' : stats.inProgress}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">In Progress</p>
        </div>
        <div className="card text-center py-3.5">
          <p className="text-2xl font-bold text-emerald-600">{statsLoading ? '—' : stats.completed}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Completed</p>
        </div>
        <div className="card text-center py-3.5 col-span-2 sm:col-span-4 lg:col-span-1">
          <p className="text-2xl font-bold text-teal-600">{statsLoading ? '—' : stats.totalCansDelivered}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Cans Delivered</p>
        </div>
      </div>

      {/* Staff Operational Route Map */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <h2 className="text-sm font-bold text-slate-900">
              Assigned Delivery Route &bull; Chennai
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {todayDeliveries.length} drop-off point(s) assigned
          </span>
        </div>

        <MapView
          height="340px"
          markers={mapMarkers}
          center={staffPosition}
          zoom={12}
          showRoute={!!deliveryRoute}
          origin={deliveryRoute?.origin}
          destination={deliveryRoute?.destination}
          className="rounded-xl overflow-hidden"
        />
      </div>

      {/* Active Delivery Workflow Card */}
      {activeDelivery && (
        <div className="card border-2 border-amber-300 bg-amber-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
              <h3 className="font-bold text-slate-900 text-sm">Active In-Progress Delivery</h3>
            </div>
            <StatusBadge status={activeDelivery.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm bg-white p-3 rounded-xl border border-amber-200/80">
            <div>
              <p className="text-xs text-slate-400 font-medium">Recipient</p>
              <p className="font-bold text-slate-900">{activeDelivery.customerId?.name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {activeDelivery.customerId?.phone}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Drop-off Address</p>
              <p className="font-medium text-xs text-slate-800 leading-snug">
                {activeDelivery.deliveryAddress || activeDelivery.customerId?.address}
              </p>
              <p className="text-xs font-semibold text-[#0284C7] mt-1">
                Order: {activeDelivery.cansOrdered} water cans
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {activeDelivery.status === 'on_the_way' && (
              <button
                onClick={() => markArrived(activeDelivery)}
                className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
              >
                <MapPin size={16} /> Mark Arrived
              </button>
            )}
            {['on_the_way', 'arrived'].includes(activeDelivery.status) && (
              <button
                onClick={() => openComplete(activeDelivery)}
                className="btn-success flex-1 py-2 text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> Complete Delivery
              </button>
            )}
          </div>
        </div>
      )}

      {/* Today's Deliveries List */}
      <div>
        <h2 className="section-title mb-3">Today&apos;s Deliveries</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card skeleton h-28"></div>
            ))}
          </div>
        ) : todayDeliveries.length === 0 ? (
          <div className="card text-center py-12">
            <Truck size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No deliveries scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayDeliveries.map((delivery) => (
              <div
                key={delivery._id}
                className="card p-4 hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-slate-400">
                      {delivery.deliveryId}
                    </span>
                    <StatusBadge status={delivery.status} />
                  </div>
                  <p className="font-bold text-slate-900 text-base">
                    {delivery.customerId?.name}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {delivery.customerId?.phone || 'No phone'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {delivery.deliveryAddress || delivery.customerId?.address}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(delivery.scheduledDate)} at {delivery.scheduledTime || '10:00 AM'}
                  </p>
                  {delivery.status === 'delivered' && (
                    <div className="flex gap-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2 mt-1">
                      <span>Delivered: <strong>{delivery.cansDelivered || delivery.cansOrdered}</strong> cans</span>
                      <span>Returned: <strong>{delivery.cansReturned || 0}</strong> cans</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right sm:mr-2">
                    <span className="text-xs text-slate-400 block">Requested</span>
                    <span className="font-bold text-[#0284C7] text-sm">
                      {delivery.cansOrdered} cans × {delivery.canSize || 20}L
                    </span>
                  </div>

                  {delivery.status === 'assigned' && (
                    <button
                      onClick={() => startDelivery(delivery)}
                      className="btn-primary text-xs py-2 px-3.5"
                    >
                      Start Delivery
                    </button>
                  )}
                  {delivery.status === 'on_the_way' && (
                    <button
                      onClick={() => markArrived(delivery)}
                      className="btn-primary text-xs py-2 px-3.5"
                    >
                      Mark Arrived
                    </button>
                  )}
                  {delivery.status === 'arrived' && (
                    <button
                      onClick={() => openComplete(delivery)}
                      className="btn-success text-xs py-2 px-3.5"
                    >
                      Complete
                    </button>
                  )}
                  {delivery.status === 'delivered' && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle size={14} /> Delivered
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {completeModal.open && (
        <Modal
          title="Complete Delivery"
          onClose={() => setCompleteModal({ open: false, delivery: null })}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Cans Delivered</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={completeForm.cansDelivered}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, cansDelivered: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="label">Empty Cans Returned</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={completeForm.cansReturned}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, cansReturned: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="label">Delivery Notes</label>
              <textarea
                className="input-field h-20"
                placeholder="Optional notes or customer signature info"
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompleteModal({ open: false, delivery: null })}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="button" onClick={completeDelivery} className="btn-success flex-1">
                Confirm Delivery
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StaffDashboard;
