import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { staffAPI, customerAPI, deliveryAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import MapView from '../../components/MapView';
import { useSocket } from '../../context/SocketContext';
import { Wifi, WifiOff, Users, Truck, Package, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveMapPage = () => {
  const [customers, setCustomers] = useState([]);
  const [dbStaff, setDbStaff] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [totalCustomersCount, setTotalCustomersCount] = useState(0);
  const [totalStaffCount, setTotalStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const { staffLocations, connected } = useSocket();

  // Helper to extract valid coordinates from any customer or staff record
  const getCoordinates = (obj) => {
    if (!obj) return null;
    const loc = obj.currentLocation || obj.location;
    let lat = loc?.lat ?? loc?.latitude ?? obj.lat ?? obj.latitude;
    let lng = loc?.lng ?? loc?.longitude ?? obj.lng ?? obj.longitude;

    if (typeof lat === 'string') lat = parseFloat(lat);
    if (typeof lng === 'string') lng = parseFloat(lng);

    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  };

  const loadData = useCallback(async (isManual = false) => {
    try {
      setLoading(true);
      setError(null);
      const [custRes, staffRes, delivRes] = await Promise.all([
        customerAPI.getAll({ limit: 100 }),
        staffAPI.getAll({ limit: 50 }),
        deliveryAPI.getAll({ status: 'on_the_way,assigned,pending', limit: 50 }),
      ]);

      const custData = custRes?.data || [];
      const staffData = staffRes?.data || [];
      const delivData = delivRes?.data || [];

      setCustomers(custData);
      setDbStaff(staffData);
      setActiveDeliveries(delivData);

      // Dynamically calculate total counts directly from database response
      setTotalCustomersCount(custRes?.pagination?.total ?? custData.length);
      setTotalStaffCount(staffRes?.pagination?.total ?? staffData.length);
      setLastRefreshed(new Date());

      if (isManual) {
        toast.success('Live map data refreshed');
      }
    } catch (err) {
      console.error('Failed to load operational map data:', err);
      setError('Unable to load live staff/customer data. Please refresh.');
      if (isManual) {
        toast.error('Unable to load live staff/customer data. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds to keep live operational state fresh
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Merge database staff records with real-time socket telemetry (deduplicated by ID)
  const staffMarkers = useMemo(() => {
    const staffMap = {};

    // 1. Initialize from DB staff
    dbStaff.forEach((s) => {
      const coords = getCoordinates(s);
      if (coords) {
        const idKey = String(s._id);
        staffMap[idKey] = {
          id: `staff-${s._id}`,
          rawId: s._id,
          staffId: s.staffId || s._id,
          role: 'staff',
          type: 'staff',
          lat: coords.lat,
          lng: coords.lng,
          title: s.name,
          subtitle: s.isOnDelivery ? 'On Delivery' : s.isOnDuty ? 'On Duty' : 'Standby',
          color: s.isOnDelivery ? 'orange' : s.isOnDuty ? 'green' : 'gray',
          phone: s.phone,
          vehicleNumber: s.vehicleNumber || 'Van',
          vehicleType: s.vehicleType || 'van',
          deliveryStatus: s.isOnDelivery ? 'In Transit' : s.isOnDuty ? 'Available' : 'Standby',
          badge: '🚚',
          lastSeen: s.currentLocation?.updatedAt,
          info: {
            'Staff Name': s.name,
            'Staff ID': s.staffId || 'N/A',
            Phone: s.phone || 'N/A',
            Vehicle: `${s.vehicleNumber || 'Van'} (${s.vehicleType || 'van'})`,
            Status: s.isOnDelivery ? 'On Delivery' : s.isOnDuty ? 'On Duty' : 'Standby',
            Deliveries: `${s.completedDeliveries || 0} completed`,
            'Last Known': s.currentLocation?.updatedAt
              ? new Date(s.currentLocation.updatedAt).toLocaleTimeString('en-IN')
              : 'Recent',
            Coordinates: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
          },
        };
      }
    });

    // 2. Real-time updates from socket telemetry (updates existing marker instead of duplicating)
    Object.values(staffLocations || {}).forEach((s) => {
      const coords = getCoordinates(s);
      if (coords) {
        // Find matching key from DB records if available
        const matchedDb = dbStaff.find(
          (db) => String(db._id) === String(s.staffId || s.id || s._id) ||
                  String(db.staffId) === String(s.staffId || s.id || s._id)
        );
        const idKey = matchedDb ? String(matchedDb._id) : String(s.staffId || s.id || s._id);
        const existing = staffMap[idKey] || {};

        staffMap[idKey] = {
          ...existing,
          id: `staff-${idKey}`,
          rawId: idKey,
          staffId: matchedDb?.staffId || existing.staffId || s.staffId || idKey,
          role: 'staff',
          type: 'staff',
          lat: coords.lat,
          lng: coords.lng,
          title: s.staffName || matchedDb?.name || existing.title || 'Delivery Staff',
          subtitle: s.isOnDelivery ? 'Live: On Delivery' : 'Live: On Duty',
          color: s.isOnDelivery ? 'orange' : 'green',
          isPulsing: true,
          phone: s.phone || matchedDb?.phone || existing.phone,
          vehicleNumber: s.vehicleNumber || matchedDb?.vehicleNumber || existing.vehicleNumber || 'Van',
          vehicleType: s.vehicleType || matchedDb?.vehicleType || existing.vehicleType || 'van',
          deliveryStatus: s.isOnDelivery ? 'Live Delivery' : 'Online',
          badge: '🚚',
          lastSeen: new Date(),
          info: {
            'Staff Name': s.staffName || matchedDb?.name || existing.title || 'Delivery Staff',
            'Staff ID': matchedDb?.staffId || existing.staffId || s.staffId || idKey,
            Phone: s.phone || matchedDb?.phone || existing.phone || 'N/A',
            Vehicle: `${s.vehicleNumber || matchedDb?.vehicleNumber || existing.vehicleNumber || 'Van'} (${s.vehicleType || matchedDb?.vehicleType || existing.vehicleType || 'van'})`,
            Status: s.isOnDelivery ? 'Active Delivery' : 'Online (GPS)',
            Speed: s.speed ? `${s.speed} km/h` : 'Moving',
            'Last Update': 'Just now (Live GPS)',
            Coordinates: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
          },
        };
      }
    });

    return Object.values(staffMap);
  }, [dbStaff, staffLocations]);

  // Customer markers dynamically generated from API/database
  const customerMarkers = useMemo(() => {
    return customers
      .map((c) => {
        const coords = getCoordinates(c);
        if (!coords) return null;

        // Check if customer has an active delivery
        const activeDeliv = activeDeliveries.find(
          (d) => String(d.customerId?._id || d.customerId) === String(c._id)
        );

        let color = 'blue';
        let deliveryStatus = 'Active';
        if (activeDeliv) {
          color = activeDeliv.status === 'on_the_way' ? 'orange' : 'blue';
          deliveryStatus = activeDeliv.status === 'on_the_way' ? 'Out for Delivery' : 'Delivery Assigned';
        }

        return {
          id: `cust-${c._id}`,
          rawId: c._id,
          role: 'customer',
          type: 'customer',
          lat: coords.lat,
          lng: coords.lng,
          title: c.name,
          subtitle: `${c.city || 'Chennai'} Customer`,
          color,
          address: c.address,
          phone: c.phone,
          canCount: c.canCount,
          nextRefillDate: c.nextRefillDate,
          deliveryStatus,
          badge: '💧',
          info: {
            'Customer Name': c.name,
            'Customer ID': c.customerId || 'N/A',
            Phone: c.phone || 'N/A',
            Address: c.address || 'N/A',
            City: c.city || 'Chennai',
            'Can Balance': `${c.canCount ?? 0} cans`,
            'Next Refill': c.nextRefillDate ? new Date(c.nextRefillDate).toLocaleDateString('en-IN') : 'N/A',
            Status: deliveryStatus,
            Coordinates: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
          },
        };
      })
      .filter(Boolean);
  }, [customers, activeDeliveries]);

  const allMarkers = useMemo(() => [...staffMarkers, ...customerMarkers], [staffMarkers, customerMarkers]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chennai Network Operational Map"
        subtitle="Complete real-time monitoring of all delivery personnel, customers, and active routes across Chennai"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition shadow-sm active:scale-95 disabled:opacity-60"
              title="Refresh live map data from server"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm ${
                connected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
              {connected ? 'Socket Live' : 'Reconnecting'}
            </div>
          </div>
        }
      />

      {/* API Error Notification */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData(true)}
            className="text-xs bg-white border border-rose-200 px-3 py-1 rounded-lg text-rose-700 font-bold hover:bg-rose-100 transition shadow-xs"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Network Overview Stats Bar - Dynamic from Database & Telemetry */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card py-3 px-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Chennai Staff</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalStaffCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {staffMarkers.length} with GPS markers
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Truck size={18} />
          </div>
        </div>
        <div className="card py-3 px-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Chennai Customers</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalCustomersCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {customerMarkers.length} on live map
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>
        <div className="card py-3 px-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Deliveries</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{activeDeliveries.length}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              In transit / assigned
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Package size={18} />
          </div>
        </div>
        <div className="card py-3 px-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Live Map Markers</p>
            <p className="text-xl font-bold text-sky-700 mt-0.5">{allMarkers.length}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              OSM Chennai Network
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
            OSM
          </div>
        </div>
      </div>

      {/* Real Interactive Leaflet OpenStreetMap */}
      <div className="card p-2.5">
        <MapView
          height="calc(100vh - 310px)"
          markers={allMarkers}
          zoom={11}
          className="rounded-xl overflow-hidden"
        />
      </div>

      {/* Active Staff Telemetry Grid - All DB Staff Dynamically Listed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Delivery Fleet Telemetry &bull; Chennai ({dbStaff.length} Staff)
          </h3>
          {lastRefreshed && (
            <span className="text-[10px] text-slate-400">
              Updated: {lastRefreshed.toLocaleTimeString('en-IN')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {dbStaff.length === 0 ? (
            <div className="col-span-3 card text-center py-6">
              <p className="text-slate-500 text-xs">No delivery personnel found in database.</p>
            </div>
          ) : (
            dbStaff.map((s) => {
              const marker = staffMarkers.find(
                (m) => String(m.rawId) === String(s._id) || String(m.staffId) === String(s.staffId)
              );
              const hasCoords = !!marker;
              const isLive = marker?.isPulsing;
              const isDelivery = s.isOnDelivery || marker?.subtitle?.includes('Delivery');

              return (
                <div key={s._id} className="card p-3 flex items-center justify-between hover:shadow-md transition">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                        isLive || isDelivery
                          ? 'bg-amber-500 animate-pulse'
                          : hasCoords || s.isOnDuty
                          ? 'bg-emerald-500'
                          : 'bg-slate-300'
                      }`}
                    ></div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs text-slate-900">{s.name}</p>
                        {s.staffId && (
                          <span className="text-[10px] font-mono text-slate-400">({s.staffId})</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {s.vehicleNumber || 'Van'} ({s.vehicleType || 'van'}) &bull; {s.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDelivery
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : hasCoords || s.isOnDuty
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isDelivery ? 'On Delivery' : isLive ? 'Live GPS' : s.isOnDuty ? 'Available' : 'Standby'}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {hasCoords ? '📍 Map Active' : 'No GPS reported'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMapPage;
