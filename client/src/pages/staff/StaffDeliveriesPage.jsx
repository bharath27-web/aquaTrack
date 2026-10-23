import React, { useState, useEffect, useCallback } from 'react';
import { deliveryAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { Package, MapPin, Phone, Calendar, CheckCircle, Truck, Clock, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const StaffDeliveriesPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [completeModal, setCompleteModal] = useState({ open: false, delivery: null });
  const [completeForm, setCompleteForm] = useState({ cansDelivered: 0, cansReturned: 0, notes: '' });
  const [completing, setCompleting] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deliveryAPI.getAll({ status: statusFilter, page, limit: 10 });
      setDeliveries(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const startDelivery = async (delivery) => {
    try {
      await deliveryAPI.update(delivery._id, { status: 'on_the_way' });
      toast.success(`En route to ${delivery.customerId?.name}`);
      fetchDeliveries();
    } catch (err) { toast.error(err.message); }
  };

  const markArrived = async (delivery) => {
    try {
      await deliveryAPI.update(delivery._id, { status: 'arrived' });
      toast.success('Marked as arrived!');
      fetchDeliveries();
    } catch (err) { toast.error(err.message); }
  };

  const openComplete = (delivery) => {
    setCompleteModal({ open: true, delivery });
    setCompleteForm({ cansDelivered: delivery.cansOrdered, cansReturned: Math.max(0, delivery.cansOrdered - 1), notes: '' });
  };

  const completeDelivery = async () => {
    try {
      setCompleting(true);
      await deliveryAPI.update(completeModal.delivery._id, {
        status: 'delivered',
        cansDelivered: completeForm.cansDelivered,
        cansReturned: completeForm.cansReturned,
        notes: completeForm.notes,
      });
      toast.success('Delivery completed! 🎉');
      setCompleteModal({ open: false, delivery: null });
      fetchDeliveries();
    } catch (err) { toast.error(err.message); } finally { setCompleting(false); }
  };

  const statusTabs = [
    { value: '', label: 'All', count: pagination.total || 0 },
    { value: 'assigned', label: 'Assigned' },
    { value: 'on_the_way', label: 'En Route' },
    { value: 'arrived', label: 'Arrived' },
    { value: 'delivered', label: 'Delivered' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="My Deliveries" subtitle={`${pagination.total || 0} deliveries assigned to you`} />

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? 'bg-[#0284C7] text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deliveries List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="card skeleton h-32" />)
        ) : deliveries.length === 0 ? (
          <EmptyState title="No deliveries found" description="No deliveries match the selected filter." icon={Package} />
        ) : (
          deliveries.map((d) => (
            <div key={d._id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{d.deliveryId}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Truck size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{d.customerId?.name || 'Customer'}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={11} />{d.customerId?.phone}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{d.deliveryAddress || d.customerId?.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                      <span>{formatDate(d.scheduledDate)} {d.scheduledTime ? `(${d.scheduledTime})` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-[#0284C7]">
                      <Package size={12} className="flex-shrink-0" />
                      <span>{d.cansOrdered} cans × {d.canSize || 20}L</span>
                    </div>
                  </div>
                  {d.status === 'delivered' && (
                    <div className="flex gap-4 text-xs text-slate-500 bg-emerald-50 rounded-lg p-2">
                      <span>✅ Delivered: <strong>{d.cansDelivered}</strong> cans</span>
                      <span>↩️ Returned: <strong>{d.cansReturned}</strong> cans</span>
                      {d.deliveredAt && <span>🕐 {formatDateTime(d.deliveredAt)}</span>}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center gap-2 sm:w-36 justify-end sm:justify-center">
                  {d.status === 'assigned' && (
                    <button onClick={() => startDelivery(d)} className="btn-primary text-xs py-2 px-4 w-full">
                      Start Delivery
                    </button>
                  )}
                  {d.status === 'on_the_way' && (
                    <button onClick={() => markArrived(d)} className="btn-primary text-xs py-2 px-4 w-full">
                      Mark Arrived
                    </button>
                  )}
                  {['on_the_way', 'arrived'].includes(d.status) && (
                    <button onClick={() => openComplete(d)} className="btn-success text-xs py-2 px-4 w-full">
                      Complete
                    </button>
                  )}
                  {d.status === 'delivered' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                      <CheckCircle size={14} /> Done
                    </span>
                  )}
                  {d.status === 'pending' && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock size={14} /> Pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && deliveries.length > 0 && (
        <Pagination currentPage={page} totalPages={pagination.pages || 1} onPageChange={setPage} totalItems={pagination.total || 0} itemsPerPage={10} />
      )}

      {/* Complete Delivery Modal */}
      <Modal
        isOpen={completeModal.open}
        onClose={() => setCompleteModal({ open: false, delivery: null })}
        title="Complete Delivery"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCompleteModal({ open: false, delivery: null })}>Cancel</button>
            <button className="btn-success" onClick={completeDelivery} disabled={completing}>
              {completing ? 'Saving...' : 'Confirm Delivery'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {completeModal.delivery && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
              <strong>{completeModal.delivery.customerId?.name}</strong> · {completeModal.delivery.cansOrdered} cans ordered
            </div>
          )}
          <div>
            <label className="label">Cans Delivered</label>
            <input type="number" min="0" className="input-field" value={completeForm.cansDelivered}
              onChange={(e) => setCompleteForm({ ...completeForm, cansDelivered: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Empty Cans Returned</label>
            <input type="number" min="0" className="input-field" value={completeForm.cansReturned}
              onChange={(e) => setCompleteForm({ ...completeForm, cansReturned: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Notes (Optional)</label>
            <textarea className="input-field h-20" placeholder="Any delivery notes..." value={completeForm.notes}
              onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffDeliveriesPage;
