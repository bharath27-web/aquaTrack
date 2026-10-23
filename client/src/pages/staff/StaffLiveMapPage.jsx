import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { deliveryAPI, locationAPI } from '../../services/api';
import MapView from '../../components/MapView';
import PageHeader from '../../components/PageHeader';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { Wifi, WifiOff, MapPin, Truck, Navigation, Package } from 'lucide-react';

const CHENNAI_DEFAULT = { lat: 13.0827, lng: 80.2707 };

const StaffLiveMapPage = () => {
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [currentGps, setCurrentGps] = useState(null);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const { user } = useAuth();
  const { emit, connected } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deliveryAPI.getToday();
      const deliveries = res.data || [];
      setTodayDeliveries(deliveries);
      setStaff(res.staff);
      const inProgress = deliveries.find((d) => ['on_the_way', 'arrived'].includes(d.status));
      if (inProgress) setActiveDelivery(inProgress);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device.');
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
        console.warn('Location error:', err.message);
        toast('Using default Chennai coordinates', { icon: '📍' });
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

  const staffPosition = useMemo(() => {
    if (currentGps) return currentGps;
    if (staff?.currentLocation?.lat && staff?.currentLocation?.lng) {
      return { lat: staff.currentLocation.lat, lng: staff.currentLocation.lng };
    }
    return CHENNAI_DEFAULT;
  }, [currentGps, staff]);

  const mapMarkers = useMemo(() => {
    const list = [];
    list.push({
      id: `staff-me`,
      type: 'staff',
      role: 'staff',
      lat: staffPosition.lat,
      lng: staffPosition.lng,
      title: `${staff?.name || user?.name || 'You'} (Current Location)`,
      subtitle: `${staff?.vehicleNumber || 'Van'} • ${trackingActive ? 'Live GPS' : 'Stored Location'}`,
      phone: staff?.phone || user?.phone,
      vehicleNumber: staff?.vehicleNumber,
      vehicleType: staff?.vehicleType || 'van',
      status: activeDelivery ? 'on_the_way' : 'on_duty',
      color: 'green',
    });

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
          status: d.status,
          color: isActive ? 'orange' : d.status === 'delivered' ? 'green' : 'blue',
          info: {
            'Cans Ordered': `${d.cansOrdered} cans`,
            'Scheduled': d.scheduledDate ? formatDate(d.scheduledDate) : 'Today',
            'Address': d.deliveryAddress || cust.address,
          },
        });
      }
    });
    return list;
  }, [staffPosition, staff, user, trackingActive, activeDelivery, todayDeliveries]);

  const deliveryRoute = useMemo(() => {
    if (!activeDelivery) return null;
    const custLoc = activeDelivery.customerId?.location;
    if (custLoc?.lat && custLoc?.lng && staffPosition?.lat && staffPosition?.lng) {
      return { origin: { lat: staffPosition.lat, lng: staffPosition.lng }, destination: { lat: custLoc.lat, lng: custLoc.lng } };
    }
    return null;
  }, [activeDelivery, staffPosition]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live Route Map"
        subtitle="Your current position and assigned delivery stops"
        actions={
          <button
            onClick={trackingActive ? stopTracking : startTracking}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm ${
              trackingActive
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-[#0284C7] text-white hover:bg-[#0369a1]'
            }`}
          >
            {trackingActive ? <WifiOff size={15} /> : <Wifi size={15} />}
            {trackingActive ? 'Stop GPS' : 'Enable Live GPS'}
          </button>
        }
      />

      {/* GPS Status Banner */}
      <div className={`card p-3 flex items-center gap-3 border-l-4 ${trackingActive ? 'border-emerald-500 bg-emerald-50' : 'border-amber-400 bg-amber-50'}`}>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${trackingActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
        <div className="text-sm">
          {trackingActive ? (
            <span className="text-emerald-800 font-medium">
              Live GPS active · Sharing your location with customers and admin
              {currentGps && <span className="text-emerald-600 ml-2">({currentGps.lat.toFixed(4)}, {currentGps.lng.toFixed(4)})</span>}
            </span>
          ) : (
            <span className="text-amber-800 font-medium">GPS not active · Enable live GPS to share your location</span>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900">Delivery Route Map · Chennai</h2>
          </div>
          <span className="text-xs text-slate-500">
            {todayDeliveries.length} stop(s) · {connected ? '🟢 Connected' : '🔴 Offline'}
          </span>
        </div>
        <MapView
          height="480px"
          markers={mapMarkers}
          center={staffPosition}
          zoom={12}
          showRoute={!!deliveryRoute}
          origin={deliveryRoute?.origin}
          destination={deliveryRoute?.destination}
          className="rounded-xl overflow-hidden"
        />
      </div>

      {/* Active Delivery Info */}
      {activeDelivery && (
        <div className="card border-2 border-amber-300 bg-amber-50/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            <h3 className="font-bold text-slate-900 text-sm">Active Delivery · En Route</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Customer</p>
              <p className="font-bold text-slate-900">{activeDelivery.customerId?.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{activeDelivery.customerId?.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Address</p>
              <p className="font-medium text-xs text-slate-800 leading-snug">{activeDelivery.deliveryAddress || activeDelivery.customerId?.address}</p>
              <p className="text-xs font-semibold text-[#0284C7] mt-1">{activeDelivery.cansOrdered} cans ordered</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Stops Summary */}
      <div className="card">
        <h3 className="section-title mb-3">Today's Delivery Stops ({todayDeliveries.length})</h3>
        <div className="space-y-2">
          {loading ? [...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />) :
           todayDeliveries.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No deliveries scheduled for today</p>
          ) : (
            todayDeliveries.map((d, idx) => (
              <div key={d._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#0284C7] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{d.customerId?.name}</p>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                    <MapPin size={10} />{d.deliveryAddress || d.customerId?.address}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-[#0284C7]">{d.cansOrdered} cans</span>
                  <span className={`w-2 h-2 rounded-full ${d.status === 'delivered' ? 'bg-emerald-500' : d.status === 'on_the_way' || d.status === 'arrived' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffLiveMapPage;
