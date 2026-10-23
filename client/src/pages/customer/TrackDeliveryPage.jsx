import React, { useState, useEffect, useMemo } from 'react';
import { deliveryAPI, customerAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import MapView from '../../components/MapView';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/helpers';
import {
  Navigation,
  MapPin,
  Truck,
  Phone,
  Droplets,
  Clock,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const CHENNAI_DEFAULT = { lat: 13.0827, lng: 80.2707 };

const TrackDeliveryPage = () => {
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { staffLocations, on, trackDelivery } = useSocket();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeDelivery?._id) {
      trackDelivery(activeDelivery._id);
    }
  }, [activeDelivery?._id, trackDelivery]);

  useEffect(() => {
    const cleanup = on('staffArrived', (data) => {
      if (activeDelivery && (data.deliveryId === activeDelivery._id || !data.deliveryId)) {
        setActiveDelivery((prev) => (prev ? { ...prev, status: 'arrived' } : prev));
      }
    });
    const cleanup2 = on('deliveryCompleted', (data) => {
      if (activeDelivery && (data.deliveryId === activeDelivery._id || !data.deliveryId)) {
        setActiveDelivery((prev) => (prev ? { ...prev, status: 'delivered' } : prev));
      }
    });
    const cleanup3 = on('deliveryStatusUpdate', (data) => {
      if (activeDelivery && data.deliveryId === activeDelivery._id) {
        setActiveDelivery((prev) => (prev ? { ...prev, status: data.status } : prev));
      }
    });
    return () => {
      cleanup();
      cleanup2();
      cleanup3();
    };
  }, [on, activeDelivery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch latest active/in-progress delivery for this customer
      const res = await deliveryAPI.getAll({ limit: 1 });
      const deliveries = res.data || [];
      const current =
        deliveries.find((d) => ['on_the_way', 'arrived', 'assigned'].includes(d.status)) ||
        deliveries[0] ||
        null;
      setActiveDelivery(current);

      // Get customer profile using the /me endpoint (works for customers)
      try {
        const custRes = await customerAPI.getMe();
        setCustomerProfile(custRes.data);
      } catch {
        // If getMe fails, try using the customerId from user
        if (user?.customerId) {
          try {
            const custRes = await customerAPI.getOne(user.customerId);
            const data = custRes.data?.customer || custRes.data;
            setCustomerProfile(data);
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const staff = activeDelivery?.staffId;
  const staffId = staff?._id;
  const socketLocation = staffId ? staffLocations[staffId] : null;

  // Staff effective location: live socket or stored coordinates
  const staffLocation = useMemo(() => {
    if (socketLocation?.location?.lat && socketLocation?.location?.lng) {
      return { lat: socketLocation.location.lat, lng: socketLocation.location.lng };
    }
    if (staff?.currentLocation?.lat && staff?.currentLocation?.lng) {
      return { lat: staff.currentLocation.lat, lng: staff.currentLocation.lng };
    }
    return null;
  }, [socketLocation, staff]);

  // Customer location
  const customerLocation = useMemo(() => {
    if (activeDelivery?.customerId?.location?.lat && activeDelivery?.customerId?.location?.lng) {
      return {
        lat: activeDelivery.customerId.location.lat,
        lng: activeDelivery.customerId.location.lng,
      };
    }
    if (customerProfile?.location?.lat && customerProfile?.location?.lng) {
      return {
        lat: customerProfile.location.lat,
        lng: customerProfile.location.lng,
      };
    }
    return CHENNAI_DEFAULT;
  }, [activeDelivery, customerProfile]);

  // Map markers: ONLY Customer location and assigned Staff location
  const mapMarkers = useMemo(() => {
    const list = [];

    // Customer marker (Blue)
    if (customerLocation?.lat && customerLocation?.lng) {
      list.push({
        id: 'my-delivery-location',
        type: 'customer',
        role: 'customer',
        lat: customerLocation.lat,
        lng: customerLocation.lng,
        title: 'Your Delivery Location',
        subtitle:
          activeDelivery?.deliveryAddress ||
          customerProfile?.address ||
          'Chennai Delivery Destination',
        phone: customerProfile?.phone || user?.phone,
        canCount: activeDelivery?.cansOrdered || customerProfile?.canCount || 2,
        status: activeDelivery?.status || 'active',
        color: 'blue',
      });
    }

    // Staff marker (Orange if en route, Green if assigned/arrived)
    if (staffLocation && staff) {
      const isOnTheWay = activeDelivery?.status === 'on_the_way';
      list.push({
        id: `staff-${staff._id}`,
        type: 'staff',
        role: 'staff',
        lat: staffLocation.lat,
        lng: staffLocation.lng,
        title: `${staff.name} (Delivery Driver)`,
        subtitle: `${staff.vehicleNumber || 'Van'} &bull; ${
          socketLocation ? 'Live GPS Telemetry' : 'Estimated Location'
        }`,
        phone: staff.phone,
        vehicleNumber: staff.vehicleNumber,
        vehicleType: staff.vehicleType,
        status: activeDelivery?.status || 'assigned',
        color: isOnTheWay ? 'orange' : 'green',
      });
    }

    return list;
  }, [customerLocation, staffLocation, staff, activeDelivery, customerProfile, user, socketLocation]);

  // Driving route between staff and customer
  const deliveryRoute = useMemo(() => {
    if (staffLocation && customerLocation) {
      return {
        origin: staffLocation,
        destination: customerLocation,
      };
    }
    return null;
  }, [staffLocation, customerLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statusConfig = {
    assigned: {
      msg: 'Your refill delivery is assigned & scheduled',
      eta: 'Estimated today',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'Assigned',
    },
    on_the_way: {
      msg: 'Delivery van is on the way to your address!',
      eta: '~15 – 25 mins',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'En Route',
    },
    arrived: {
      msg: 'Delivery staff has arrived at your gate!',
      eta: 'Arrived now',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'Arrived',
    },
    delivered: {
      msg: 'Order successfully delivered & bottles returned',
      eta: 'Completed',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-700',
      badge: 'Delivered',
    },
  };

  const currentStatus = statusConfig[activeDelivery?.status] || statusConfig.assigned;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#0284C7]" />
            Track Water Delivery
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time delivery progress &bull; Chennai service zone
          </p>
        </div>
        {activeDelivery && <StatusBadge status={activeDelivery.status} />}
      </div>

      {/* Real-Time Interactive Leaflet Map */}
      <div className="card p-2.5 bg-white shadow-sm space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse"></span>
            <span>Live Delivery Tracking &bull; OpenStreetMap</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {socketLocation ? '📡 Live Telemetry Active' : '📍 Route Telemetry'}
          </span>
        </div>

        <MapView
          height="380px"
          markers={mapMarkers}
          center={customerLocation}
          zoom={13}
          showRoute={!!deliveryRoute}
          origin={deliveryRoute?.origin}
          destination={deliveryRoute?.destination}
          className="rounded-xl overflow-hidden"
        />
      </div>

      {/* Active Delivery Status Card */}
      {activeDelivery ? (
        <div
          className={`card p-4 border ${currentStatus.border} ${currentStatus.bg} space-y-4 transition-all`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                Order #{activeDelivery.deliveryId || 'DEL-ACTIVE'}
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {currentStatus.msg}
              </h2>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold text-slate-600">Estimated Arrival:</span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-[#0284C7] shadow-sm">
                {currentStatus.eta}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/90 p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Assigned Delivery Driver</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {staff?.name || 'AquaTrack Courier'}
              </p>
              <p className="text-slate-500 mt-0.5">
                Vehicle: {staff?.vehicleNumber || 'Chennai Van'}
              </p>
              {staff?.phone && (
                <a
                  href={`tel:${staff.phone}`}
                  className="inline-flex items-center gap-1.5 text-[#0284C7] font-semibold mt-2 hover:underline"
                >
                  <Phone size={13} /> Call Driver
                </a>
              )}
            </div>

            <div>
              <p className="text-slate-400 font-medium">Delivery Destination</p>
              <p className="font-semibold text-slate-800 leading-snug mt-0.5">
                {activeDelivery.deliveryAddress || customerProfile?.address || 'Chennai'}
              </p>
              <p className="text-slate-500 mt-1 flex items-center gap-1">
                <MapPin size={12} className="text-slate-400" />
                {customerProfile?.city || 'Chennai'}
              </p>
            </div>

            <div>
              <p className="text-slate-400 font-medium">Order Quantity</p>
              <p className="font-bold text-[#0284C7] text-sm mt-0.5 flex items-center gap-1">
                <Droplets size={14} /> {activeDelivery.cansOrdered} Pure Water Cans ({activeDelivery.canSize || 20}L)
              </p>
              <p className="text-slate-500 mt-1">
                Slot: {formatDate(activeDelivery.scheduledDate || new Date())} {activeDelivery.scheduledTime ? `at ${activeDelivery.scheduledTime}` : ''}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center bg-white space-y-2">
          <div className="w-12 h-12 rounded-full bg-sky-50 text-[#0284C7] flex items-center justify-center mx-auto mb-2">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No Active Deliveries Right Now</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don&apos;t have any water cans currently in transit. Your delivery location in Chennai is marked on the map above.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrackDeliveryPage;
