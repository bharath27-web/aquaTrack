import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers } from 'lucide-react';

// Default center: Chennai, Tamil Nadu, India
const DEFAULT_CHENNAI_CENTER = [13.0827, 80.2707];
const DEFAULT_ZOOM = 11;

// Fix standard Leaflet default icon paths if anyone uses standard icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Color mapping for markers
const COLOR_MAP = {
  green: '#10B981', // Staff (On Duty / Available)
  blue: '#0284C7',  // Customer
  orange: '#F59E0B', // Active Delivery / In Transit
  red: '#EF4444',    // Delayed / Overdue
  purple: '#8B5CF6',
  gray: '#64748B',
};

// Create custom animated SVG Leaflet marker
const createCustomIcon = (marker) => {
  const color = COLOR_MAP[marker.color] || COLOR_MAP.blue;
  const isPulsing = marker.isPulsing || marker.color === 'orange';
  const label = marker.badge || (marker.role === 'staff' || marker.type === 'staff' ? '🚚' : '💧');

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 38px; height: 38px;">
      ${isPulsing ? `
        <span class="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style="background-color: ${color};"></span>
      ` : ''}
      <div class="relative w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs text-white font-bold transition-transform duration-200 hover:scale-125" style="background: radial-gradient(circle at 30% 30%, #ffffff 0%, ${color} 70%); box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
        <span style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.6)); font-size: 13px;">${label}</span>
      </div>
      <div class="absolute -bottom-1 w-2 h-2 rounded-full border border-white" style="background-color: ${color};"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 36],
    popupAnchor: [0, -32],
  });
};

// Map controller component for smooth panning and viewport auto-fit
const MapViewController = ({ center, zoom, bounds, markerCount }) => {
  const map = useMap();
  const initialFitDone = React.useRef(false);
  const prevCount = React.useRef(markerCount);

  useEffect(() => {
    if (!initialFitDone.current && bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: false });
      initialFitDone.current = true;
    } else if (prevCount.current !== markerCount && bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
      prevCount.current = markerCount;
    } else if (!initialFitDone.current && center) {
      map.setView(center, zoom, { animate: false });
      initialFitDone.current = true;
    }
  }, [center, zoom, bounds, markerCount, map]);

  return null;
};

const MapView = ({
  height = '420px',
  markers = [],
  center,
  zoom = DEFAULT_ZOOM,
  showRoute = false,
  origin,
  destination,
  onMarkerClick,
  className = '',
  legend = true,
}) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);

  // Compute map center
  const mapCenter = useMemo(() => {
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      return [center.lat, center.lng];
    }
    if (center && Array.isArray(center) && center.length === 2) {
      return center;
    }
    if (markers.length > 0 && markers[0].lat && markers[0].lng) {
      return [markers[0].lat, markers[0].lng];
    }
    return DEFAULT_CHENNAI_CENTER;
  }, [center, markers]);

  // Compute bounding box if multiple markers or route points exist
  const bounds = useMemo(() => {
    const pts = [];
    markers.forEach((m) => {
      if (m.lat && m.lng) pts.push([m.lat, m.lng]);
    });
    if (origin?.lat && origin?.lng) pts.push([origin.lat, origin.lng]);
    if (destination?.lat && destination?.lng) pts.push([destination.lat, destination.lng]);
    return pts.length > 1 ? pts : null;
  }, [markers, origin, destination]);

  // Fetch real road route using free OpenStreetMap OSRM routing service
  useEffect(() => {
    if (!showRoute || !origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      setRouteCoordinates([]);
      return;
    }

    let isSubscribed = true;
    const fetchOSRMRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (isSubscribed && data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
          // OSRM returns coordinates as [lng, lat], Leaflet expects [lat, lng]
          const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          setRouteCoordinates(coords);
          setRouteDistance((data.routes[0].distance / 1000).toFixed(1)); // km
          setRouteDuration(Math.round(data.routes[0].duration / 60)); // minutes
        } else if (isSubscribed) {
          // Fallback to straight line connection
          setRouteCoordinates([
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ]);
        }
      } catch (err) {
        // Fallback to straight line connection if OSRM is unreachable
        if (isSubscribed) {
          setRouteCoordinates([
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ]);
        }
      }
    };

    fetchOSRMRoute();
    return () => {
      isSubscribed = false;
    };
  }, [showRoute, origin, destination]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-md bg-slate-50 transition-all ${className}`}
      style={{ height, minHeight: '280px' }}
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapViewController center={mapCenter} zoom={zoom} bounds={bounds} markerCount={markers.length} />

        {/* Route Polyline */}
        {showRoute && routeCoordinates.length > 0 && (
          <>
            {/* Soft outer glow */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#0284C7',
                weight: 8,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Crisp main line */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#0369A1',
                weight: 4,
                opacity: 0.9,
                dashArray: '8, 8',
                lineCap: 'round',
              }}
            />
          </>
        )}

        {/* Markers */}
        {markers
          .filter((m) => typeof m.lat === 'number' && typeof m.lng === 'number' && !isNaN(m.lat) && !isNaN(m.lng))
          .map((m, idx) => (
            <Marker
              key={m.id || idx}
              position={[m.lat, m.lng]}
              icon={createCustomIcon(m)}
              eventHandlers={{
                click: () => onMarkerClick?.(m),
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-1 min-w-[210px] text-slate-800">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-bold text-sm text-slate-900">{m.title || 'Location'}</span>
                    {m.subtitle && (
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {m.subtitle}
                      </span>
                    )}
                  </div>

                  {m.address && (
                    <p className="text-xs text-slate-600 mt-1.5 leading-snug">
                      <span className="font-semibold text-slate-700">Address:</span> {m.address}
                    </p>
                  )}

                  {m.phone && (
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">Phone:</span>{' '}
                      <a href={`tel:${m.phone}`} className="text-sky-600 font-medium hover:underline">
                        {m.phone}
                      </a>
                    </p>
                  )}

                  {m.vehicleNumber && (
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">Vehicle:</span> {m.vehicleNumber} ({m.vehicleType || 'van'})
                    </p>
                  )}

                  {m.canCount !== undefined && (
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">Can Count:</span> {m.canCount} cans
                    </p>
                  )}

                  {m.cansOrdered !== undefined && (
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">Cans Ordered:</span> {m.cansOrdered} cans
                    </p>
                  )}

                  {m.nextRefillDate && (
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">Next Refill:</span>{' '}
                      {new Date(m.nextRefillDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                  )}

                  {m.deliveryStatus && (
                    <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Status</span>
                      <span className="font-semibold capitalize text-sky-700">{m.deliveryStatus.replace('_', ' ')}</span>
                    </div>
                  )}

                  {m.info && Object.keys(m.info).length > 0 && (
                    <div className="mt-2 pt-1 border-t border-slate-100 space-y-0.5">
                      {Object.entries(m.info).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-slate-500">{key}:</span>
                          <span className="font-medium text-slate-700">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating Status & OSRM Routing Pill */}
      {showRoute && routeDistance && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Chennai Delivery Route: <strong className="text-sky-700">{routeDistance} km</strong> ({routeDuration} mins)</span>
        </div>
      )}

      {/* Interactive Map Legend */}
      {legend && (
        <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200 text-[11px] text-slate-700 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span> Staff
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shadow-sm"></span> Customer
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></span> Active Delivery
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></span> Delayed/Overdue
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
