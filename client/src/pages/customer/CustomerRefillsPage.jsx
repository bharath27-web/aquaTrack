import React, { useState, useEffect, useCallback } from 'react';
import { refillAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RefreshCw,
  Calendar,
  Droplets,
  Clock,
  Plus,
  Send,
  Truck,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

const CustomerRefillsPage = () => {
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const { user } = useAuth();
  const { on } = useSocket();
  const profile = user?.profile;

  // Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    requestedDate: tomorrowStr,
    requestedTime: '10:00 AM',
    quantity: 10,
    canSize: 20,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const fetchRefills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await refillAPI.getAll({ page, limit: 10 });
      setRefills(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error('Error fetching refills:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchRefills();
  }, [fetchRefills]);

  // Real-time socket updates for refill and delivery status
  useEffect(() => {
    const handleStatusUpdate = (data) => {
      fetchRefills();
    };

    const cleanup1 = on('refillStatusUpdate', handleStatusUpdate);
    const cleanup2 = on('deliveryStatusUpdate', handleStatusUpdate);
    const cleanup3 = on('deliveryCompleted', handleStatusUpdate);

    return () => {
      if (cleanup1) cleanup1();
      if (cleanup2) cleanup2();
      if (cleanup3) cleanup3();
    };
  }, [on, fetchRefills]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!formData.requestedDate) {
      return toast.error('Please select a refill date');
    }
    if (formData.requestedDate < todayStr) {
      return toast.error('Refill date cannot be in the past');
    }
    if (!formData.quantity || formData.quantity <= 0) {
      return toast.error('Quantity must be at least 1 can');
    }

    try {
      setSubmitting(true);
      const res = await refillAPI.create({
        requestedDate: formData.requestedDate,
        requestedTime: formData.requestedTime,
        quantity: parseInt(formData.quantity, 10),
        canSize: parseInt(formData.canSize, 10) || 20,
        notes: formData.notes,
      });

      toast.success(res.message || 'Refill requested successfully! Admin will assign delivery staff.', {
        duration: 5000,
        icon: '💧',
      });

      // Reset form to default values for next request
      setFormData({
        requestedDate: tomorrowStr,
        requestedTime: '10:00 AM',
        quantity: 10,
        canSize: 20,
        notes: '',
      });

      // Refresh list immediately so the new request appears at the top
      setPage(1);
      fetchRefills();
    } catch (err) {
      toast.error(err.message || 'Failed to submit refill request');
    } finally {
      setSubmitting(false);
    }
  };

  const timeOptions = [
    '08:00 AM',
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
    '06:00 PM',
  ];

  const quickQuantities = [2, 5, 10, 15, 20];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refill Requests"
        subtitle="Specify what you need for each refill request. Choose your quantity, can size, date, and preferred time."
      />

      {/* Request Refill Form Card */}
      <div className="card border-2 border-primary-100 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shadow-sm">
              <Droplets size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Request Water Refill</h2>
              <p className="text-xs text-muted">What do you need and when do you need it?</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitRequest} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Quantity */}
            <div className="space-y-2">
              <label className="label flex items-center justify-between">
                <span>Quantity (Cans) *</span>
                <span className="text-xs text-primary-700 font-bold">{formData.quantity} Cans</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center font-bold text-gray-700 text-lg transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="input-field text-center font-bold text-base"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center font-bold text-gray-700 text-lg transition-colors"
                >
                  +
                </button>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {quickQuantities.map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setFormData({ ...formData, quantity: qty })}
                    className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                      formData.quantity === qty
                        ? 'bg-[#0284C7] text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Can Size */}
            <div className="space-y-2">
              <label className="label">Can Size *</label>
              <select
                className="input-field font-medium h-[42px]"
                value={formData.canSize}
                onChange={(e) =>
                  setFormData({ ...formData, canSize: parseInt(e.target.value, 10) || 20 })
                }
                required
              >
                <option value={20}>20 Litres (Standard)</option>
                <option value={10}>10 Litres (Compact)</option>
              </select>
              <p className="text-xs text-muted">
                Total Volume: <span className="font-semibold text-gray-800">{formData.quantity * formData.canSize} Litres</span>
              </p>
            </div>

            {/* 3. Refill Date */}
            <div className="space-y-2">
              <label className="label">Refill Date *</label>
              <input
                type="date"
                min={todayStr}
                className="input-field font-medium h-[42px]"
                value={formData.requestedDate}
                onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
                required
              />
              <p className="text-xs text-muted">Past dates not allowed</p>
            </div>

            {/* 4. Preferred Time */}
            <div className="space-y-2">
              <label className="label">Preferred Time *</label>
              <select
                className="input-field font-medium h-[42px]"
                value={formData.requestedTime}
                onChange={(e) => setFormData({ ...formData, requestedTime: e.target.value })}
                required
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted">Estimated arrival window</p>
            </div>
          </div>

          {/* Notes & Submit Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end pt-2">
            <div className="lg:col-span-3">
              <label className="label">Delivery Instructions / Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Leave at door, call before arrival, ring doorbell"
                className="input-field"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full h-[42px] flex items-center justify-center gap-2 shadow-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Request Refill</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Refill History Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="section-title">My Refill Requests</h3>
            <p className="text-xs text-muted mt-0.5">
              Track the status of your requested water can refills
            </p>
          </div>
          <button
            onClick={fetchRefills}
            className="text-xs flex items-center gap-1.5 text-primary-700 hover:text-primary-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Refill ID</th>
                <th className="table-header">Requested Date</th>
                <th className="table-header">Preferred Time</th>
                <th className="table-header">Quantity & Size</th>
                <th className="table-header">Status</th>
                <th className="table-header">Assigned Staff</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : refills.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No refill requests yet"
                      description="Use the form above to request your required number of cans."
                      icon={RefreshCw}
                    />
                  </td>
                </tr>
              ) : (
                refills.map((r) => {
                  const staff = r.assignedStaffId;
                  const qty = r.quantity || r.cansCount;
                  const size = r.canSize || 20;
                  const isTrackable = ['assigned', 'out_for_delivery', 'on_the_way', 'arrived'].includes(r.status);

                  return (
                    <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell font-mono text-xs font-semibold text-primary-700">
                        {r.refillId}
                      </td>
                      <td className="table-cell text-sm font-medium">
                        {formatDate(r.requestedDate || r.scheduledDate)}
                      </td>
                      <td className="table-cell text-sm text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-400" />
                          <span>{r.requestedTime || '10:00 AM'}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <Droplets size={14} className="text-[#0284C7]" />
                          <span className="font-bold text-gray-900">
                            {qty} cans
                          </span>
                          <span className="text-xs text-muted">
                            ({size}L)
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={r.status} type="refill" />
                      </td>
                      <td className="table-cell">
                        {staff ? (
                          <div>
                            <p className="font-semibold text-xs text-gray-900">{staff.name}</p>
                            <p className="text-[11px] text-muted">{staff.vehicleNumber || staff.phone}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium">
                            Pending assignment
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        {isTrackable ? (
                          <Link
                            to="/customer/track"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0284C7] bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Navigation size={12} />
                            <span>Track Live</span>
                          </Link>
                        ) : r.status === 'delivered' ? (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 size={13} /> Delivered
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={pagination.pages || 1}
          onPageChange={setPage}
          totalItems={pagination.total || 0}
          itemsPerPage={10}
        />
      </div>
    </div>
  );
};

export default CustomerRefillsPage;
