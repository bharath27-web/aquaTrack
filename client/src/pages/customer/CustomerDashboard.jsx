import React, { useState, useEffect } from 'react';
import { deliveryAPI, notificationAPI } from '../../services/api';
import { formatDate, formatCurrency, daysUntil } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { Package, Droplets, Calendar, CreditCard, Truck, Star, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ratingAPI } from '../../services/api';
import Modal from '../../components/Modal';

const CustomerDashboard = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { on, activeDeliveryStatus } = useSocket();
  const [ratingModal, setRatingModal] = useState({ open: false, delivery: null });
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const profile = user?.profile;

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    const cleanup = on('deliveryStatusUpdate', (data) => {
      toast.info(`Delivery status: ${data.status.replace(/_/g, ' ')}`, { icon: '🚚' });
      fetchDeliveries();
    });
    return cleanup;
  }, [on]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await deliveryAPI.getAll({ limit: 5 });
      setDeliveries(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  const activeDelivery = deliveries.find(d => ['assigned', 'on_the_way', 'arrived'].includes(d.status));
  const lastCompleted = deliveries.find(d => d.status === 'delivered');
  const daysToRefill = profile?.nextRefillDate ? daysUntil(profile.nextRefillDate) : null;

  const handleRate = async () => {
    try {
      await ratingAPI.create({ deliveryId: ratingModal.delivery._id, rating, feedback });
      toast.success('Thank you for your feedback!');
      setRatingModal({ open: false, delivery: null });
      fetchDeliveries();
    } catch (err) { toast.error(err.message); }
  };

  const statusMessages = {
    assigned: { msg: 'Your delivery has been assigned 📋', color: 'blue' },
    on_the_way: { msg: 'Your delivery is on the way! 🚚', color: 'orange' },
    arrived: { msg: 'Delivery staff has arrived! 📍', color: 'green' },
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hello, ${user?.name?.split(' ')[0]}! 👋`}
        subtitle="Welcome to your AquaTrack dashboard"
        actions={
          <Link to="/customer/refills" className="btn-primary flex items-center gap-1.5 shadow-sm text-sm">
            <Droplets size={16} /> Request Refill
          </Link>
        }
      />

      {/* Active Delivery Alert */}
      {activeDelivery && (
        <div className={`card border-l-4 ${activeDelivery.status === 'arrived' ? 'border-success bg-green-50' : activeDelivery.status === 'on_the_way' ? 'border-warning bg-orange-50' : 'border-primary-600 bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {activeDelivery.status === 'arrived' ? '📍' : activeDelivery.status === 'on_the_way' ? '🚚' : '📋'}
              </div>
              <div>
                <p className="font-semibold text-dark">{statusMessages[activeDelivery.status]?.msg}</p>
                <p className="text-xs text-muted mt-0.5">
                  {activeDelivery.cansOrdered} cans ({activeDelivery.canSize || 20}L) · Staff: {activeDelivery.staffId?.name || 'Courier'} · {activeDelivery.staffId?.vehicleNumber || ''}
                </p>
              </div>
            </div>
            <Link to="/customer/track" className="btn-primary text-sm">
              <Navigation size={14} /> Track
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Droplets size={20} className="text-primary-700" />
          </div>
          <p className="text-3xl font-bold text-primary-700">{profile?.canCount || 0}</p>
          <p className="text-xs text-muted mt-1">Cans Balance</p>
          <p className="text-xs text-gray-400 mt-0.5">{profile?.canCapacity}L each</p>
        </div>

        <div className="card text-center">
          <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Calendar size={20} className="text-accent" />
          </div>
          <p className={`text-xl font-bold ${daysToRefill !== null && daysToRefill <= 2 ? 'text-danger' : daysToRefill !== null && daysToRefill <= 5 ? 'text-warning' : 'text-dark'}`}>
            {daysToRefill !== null ? `${daysToRefill}d` : 'N/A'}
          </p>
          <p className="text-xs text-muted mt-1">Next Refill</p>
          <p className="text-xs text-gray-400 mt-0.5">{profile?.nextRefillDate ? formatDate(profile.nextRefillDate) : 'Not set'}</p>
        </div>

        <div className="card text-center">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Truck size={20} className="text-success" />
          </div>
          <p className="text-3xl font-bold text-success">{profile?.totalDeliveries || 0}</p>
          <p className="text-xs text-muted mt-1">Total Deliveries</p>
          <p className="text-xs text-gray-400 mt-0.5">All time</p>
        </div>

        <div className="card text-center">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <CreditCard size={20} className="text-danger" />
          </div>
          <p className={`text-xl font-bold ${profile?.outstandingBalance > 0 ? 'text-danger' : 'text-success'}`}>
            {formatCurrency(profile?.outstandingBalance || 0)}
          </p>
          <p className="text-xs text-muted mt-1">Outstanding</p>
          <p className="text-xs text-gray-400 mt-0.5">{profile?.outstandingBalance > 0 ? 'Payment due' : 'No dues'}</p>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Deliveries</h2>
          <Link to="/customer/deliveries" className="text-sm text-primary-700 hover:underline">View all</Link>
        </div>
        <div className="space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg"></div>)
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8">
              <Package size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted">No deliveries yet</p>
            </div>
          ) : (
            deliveries.map((d) => (
              <div key={d._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                    <Package size={15} className="text-primary-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark">{d.deliveryId}</p>
                    <p className="text-xs text-muted">{formatDate(d.scheduledDate)} · {d.cansOrdered} cans</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={d.status} />
                  {d.status === 'delivered' && !d.isRated && (
                    <button
                      onClick={() => setRatingModal({ open: true, delivery: d })}
                      className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <Star size={12} /> Rate
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rating Modal */}
      <Modal isOpen={ratingModal.open} onClose={() => setRatingModal({ open: false, delivery: null })} title="Rate Your Delivery" size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRatingModal({ open: false, delivery: null })}>Skip</button>
            <button className="btn-primary" onClick={handleRate}>Submit Rating</button>
          </>
        }
      >
        <div className="text-center space-y-4">
          <p className="text-muted text-sm">How was your delivery by <strong>{ratingModal.delivery?.staffId?.name || 'the staff'}</strong>?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button key={r} onClick={() => setRating(r)} className={`text-3xl transition-transform hover:scale-110 ${r <= rating ? '' : 'grayscale opacity-30'}`}>⭐</button>
            ))}
          </div>
          <p className="text-sm font-medium text-dark">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}</p>
          <textarea className="input-field" rows={3} placeholder="Optional feedback..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDashboard;
