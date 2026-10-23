import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit, Trash2, Filter } from 'lucide-react';
import { deliveryAPI, customerAPI, staffAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate, formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Truck } from 'lucide-react';

const initialForm = {
  customerId: '', staffId: '', scheduledDate: '', scheduledTime: '',
  cansOrdered: 1, notes: '', amount: 60,
};

const DeliveriesPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [statusForm, setStatusForm] = useState({ status: '', staffId: '', cansDelivered: 0, cansReturned: 0, notes: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cancelDialog, setCancelDialog] = useState({ open: false, delivery: null });

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deliveryAPI.getAll({ search, status: statusFilter, page, limit: 10 });
      setDeliveries(res.data || []);
      setPagination(res.pagination || {});
    } catch {} finally { setLoading(false); }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    Promise.all([
      customerAPI.getAll({ limit: 100 }),
      staffAPI.getAll({ limit: 50 }),
    ]).then(([cRes, sRes]) => {
      setCustomers(cRes.data || []);
      setStaff(sRes.data || []);
    });
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await deliveryAPI.create(form);
      toast.success('Delivery created successfully');
      setShowModal(false);
      setForm(initialForm);
      fetchDeliveries();
    } catch (err) { toast.error(err.message || 'Failed to create delivery'); } finally { setFormLoading(false); }
  };

  const openStatusUpdate = (delivery) => {
    setSelectedDelivery(delivery);
    setStatusForm({
      status: delivery.status,
      staffId: delivery.staffId?._id || '',
      cansDelivered: delivery.cansOrdered,
      cansReturned: 0,
      notes: '',
    });
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    try {
      setFormLoading(true);
      await deliveryAPI.update(selectedDelivery._id, statusForm);
      toast.success('Delivery updated');
      setShowStatusModal(false);
      fetchDeliveries();
    } catch (err) { toast.error(err.message); } finally { setFormLoading(false); }
  };

  const handleCancel = async () => {
    try {
      await deliveryAPI.delete(cancelDialog.delivery._id);
      toast.success('Delivery cancelled');
      setCancelDialog({ open: false, delivery: null });
      fetchDeliveries();
    } catch (err) { toast.error(err.message); }
  };

  const statuses = ['pending', 'assigned', 'on_the_way', 'arrived', 'delivered', 'failed', 'cancelled', 'rescheduled'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        subtitle={`${pagination.total || 0} total deliveries`}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Create Delivery
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by delivery ID..." className="flex-1" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-40">
          <option value="">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Staff</th>
                <th className="table-header">Date</th>
                <th className="table-header">Cans</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded"></div></td>)}</tr>
                ))
              ) : deliveries.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No deliveries found" icon={Truck} /></td></tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50/50">
                    <td className="table-cell font-mono text-xs text-primary-700">{d.deliveryId}</td>
                    <td className="table-cell">
                      <p className="font-medium">{d.customerId?.name || 'N/A'}</p>
                      <p className="text-xs text-muted">{d.customerId?.phone}</p>
                    </td>
                    <td className="table-cell">
                      <p className="text-sm">{d.staffId?.name || <span className="text-warning text-xs">Unassigned</span>}</p>
                      <p className="text-xs text-muted">{d.staffId?.vehicleNumber}</p>
                    </td>
                    <td className="table-cell text-sm">{formatDate(d.scheduledDate)}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-primary-700">{d.cansOrdered}</span>{' '}
                      <span className="text-xs text-muted">({d.canSize || 20}L)</span>
                    </td>
                    <td className="table-cell font-medium">{formatCurrency(d.amount)}</td>
                    <td className="table-cell"><StatusBadge status={d.status} /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openStatusUpdate(d)} className="p-1.5 hover:bg-blue-50 rounded-lg text-primary-700 transition-colors" title="Update Status"><Edit size={15} /></button>
                        {!['cancelled', 'delivered'].includes(d.status) && (
                          <button onClick={() => setCancelDialog({ open: true, delivery: d })} className="p-1.5 hover:bg-red-50 rounded-lg text-danger transition-colors" title="Cancel"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={pagination.pages || 1} onPageChange={setPage} totalItems={pagination.total || 0} itemsPerPage={10} />
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Delivery" size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={formLoading}>{formLoading ? 'Creating...' : 'Create Delivery'}</button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="label">Customer *</label>
            <select className="input-field" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
              <option value="">Select customer</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assign Staff</label>
            <select className="input-field" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
              <option value="">Unassigned</option>
              {staff.map(s => <option key={s._id} value={s._id}>{s.name} - {s.vehicleNumber}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Scheduled Date *</label>
              <input type="date" className="input-field" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Time Slot</label>
              <input type="time" className="input-field" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Number of Cans *</label>
              <input type="number" className="input-field" value={form.cansOrdered} onChange={(e) => setForm({ ...form, cansOrdered: parseInt(e.target.value) || 1 })} min="1" required />
            </div>
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} min="0" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Delivery" size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleStatusUpdate} disabled={formLoading}>{formLoading ? 'Updating...' : 'Update'}</button>
          </>
        }
      >
        {selectedDelivery && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-dark">{selectedDelivery.deliveryId} — {selectedDelivery.customerId?.name}</p>
              <p className="text-xs text-muted">{selectedDelivery.cansOrdered} cans · {formatDate(selectedDelivery.scheduledDate)}</p>
            </div>
            <div>
              <label className="label">Status *</label>
              <select className="input-field" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign/Change Staff</label>
              <select className="input-field" value={statusForm.staffId} onChange={(e) => setStatusForm({ ...statusForm, staffId: e.target.value })}>
                <option value="">Keep current</option>
                {staff.map(s => <option key={s._id} value={s._id}>{s.name} - {s.vehicleNumber}</option>)}
              </select>
            </div>
            {statusForm.status === 'delivered' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cans Delivered</label>
                  <input type="number" className="input-field" value={statusForm.cansDelivered} onChange={(e) => setStatusForm({ ...statusForm, cansDelivered: parseInt(e.target.value) || 0 })} min="0" />
                </div>
                <div>
                  <label className="label">Cans Returned</label>
                  <input type="number" className="input-field" value={statusForm.cansReturned} onChange={(e) => setStatusForm({ ...statusForm, cansReturned: parseInt(e.target.value) || 0 })} min="0" />
                </div>
              </div>
            )}
            <div>
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={statusForm.notes} onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={cancelDialog.open} onClose={() => setCancelDialog({ open: false, delivery: null })}
        onConfirm={handleCancel}
        title="Cancel Delivery"
        message={`Are you sure you want to cancel delivery ${cancelDialog.delivery?.deliveryId}?`}
        confirmLabel="Cancel Delivery"
      />
    </div>
  );
};

export default DeliveriesPage;
