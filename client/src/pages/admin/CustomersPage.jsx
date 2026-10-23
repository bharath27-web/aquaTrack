import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit, UserX, Phone, Mail, MapPin } from 'lucide-react';
import { customerAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate, formatCurrency, getInitials, getAvatarColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const initialForm = {
  name: '', email: '', phone: '', password: 'aquatrack@123',
  address: '', city: '', pincode: '', canCount: 0, canCapacity: 20, refillFrequency: 7, notes: '',
  lat: '', lng: '',
};

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, customer: null });
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getAll({ search, status: statusFilter, page, limit: 10 });
      setCustomers(res.data || []);
      setPagination(res.pagination || {});
    } catch {} finally { setLoading(false); }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const openCreate = () => { setEditCustomer(null); setForm(initialForm); setShowModal(true); };
  const openEdit = (c) => {
    setEditCustomer(c);
    setForm({
      name: c.name, email: c.email, phone: c.phone, password: '',
      address: c.address, city: c.city, pincode: c.pincode || '',
      canCount: c.canCount, canCapacity: c.canCapacity, refillFrequency: c.refillFrequency, notes: c.notes || '',
      lat: c.location?.lat ?? '',
      lng: c.location?.lng ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      const payload = { ...form };
      if (payload.lat !== '' && payload.lat !== null && payload.lat !== undefined) {
        payload.lat = parseFloat(payload.lat);
      } else {
        delete payload.lat;
      }
      if (payload.lng !== '' && payload.lng !== null && payload.lng !== undefined) {
        payload.lng = parseFloat(payload.lng);
      } else {
        delete payload.lng;
      }

      if (editCustomer) {
        await customerAPI.update(editCustomer._id, payload);
        toast.success('Customer updated successfully');
      } else {
        const res = await customerAPI.create(payload);
        const msg = res.message || 'Customer created successfully! They can now log in.';
        toast.success(msg, { duration: 6000 });
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await customerAPI.delete(deleteDialog.customer._id);
      toast.success('Customer deactivated');
      setDeleteDialog({ open: false, customer: null });
      fetchCustomers();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${pagination.total || 0} total customers registered`}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Customer
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, phone, ID..." className="flex-1" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-36">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Customer</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Location</th>
                <th className="table-header">Cans</th>
                <th className="table-header">Next Refill</th>
                <th className="table-header">Balance</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded"></div></td>)}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No customers found" description="Add your first customer to get started." /></td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(c.name)}`}>
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <p className="font-medium text-dark">{c.name}</p>
                          <p className="text-xs text-muted font-mono">{c.customerId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted"><Phone size={11} />{c.phone}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted"><Mail size={11} />{c.email}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted"><MapPin size={11} />{c.city}</div>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-primary-700">{c.canCount}</span>
                      <span className="text-xs text-muted"> / {c.canCapacity}L</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm">{c.nextRefillDate ? formatDate(c.nextRefillDate) : 'Not set'}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`font-medium ${c.outstandingBalance > 0 ? 'text-danger' : 'text-success'}`}>
                        {formatCurrency(c.outstandingBalance)}
                      </span>
                    </td>
                    <td className="table-cell"><StatusBadge status={c.status} type="customer" /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/customers/${c._id}`)} className="p-1.5 hover:bg-blue-50 rounded-lg text-primary-700 transition-colors" title="View"><Eye size={15} /></button>
                        <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors" title="Edit"><Edit size={15} /></button>
                        {c.status === 'active' && <button onClick={() => setDeleteDialog({ open: true, customer: c })} className="p-1.5 hover:bg-red-50 rounded-lg text-danger transition-colors" title="Deactivate"><UserX size={15} /></button>}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal} onClose={() => setShowModal(false)}
        title={editCustomer ? 'Edit Customer' : 'Add New Customer'} size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={formLoading}>
              {formLoading ? 'Saving...' : editCustomer ? 'Update' : 'Create Customer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          {!editCustomer && (
            <div className="col-span-2">
              <label className="label">Password</label>
              <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="aquatrack@123" />
            </div>
          )}
          <div className="col-span-2">
            <label className="label">Address *</label>
            <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          </div>
          <div>
            <label className="label">City *</label>
            <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          </div>
          <div>
            <label className="label">Pincode</label>
            <input className="input-field" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </div>
          <div>
            <label className="label">Latitude (optional - for map)</label>
            <input
              type="number"
              step="any"
              className="input-field"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              placeholder="e.g. 13.0827"
            />
          </div>
          <div>
            <label className="label">Longitude (optional - for map)</label>
            <input
              type="number"
              step="any"
              className="input-field"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              placeholder="e.g. 80.2707"
            />
          </div>
          <div>
            <label className="label">Initial Can Count</label>
            <input type="number" className="input-field" value={form.canCount} onChange={(e) => setForm({ ...form, canCount: parseInt(e.target.value) || 0 })} min="0" />
          </div>
          <div>
            <label className="label">Can Capacity (L)</label>
            <select className="input-field" value={form.canCapacity} onChange={(e) => setForm({ ...form, canCapacity: parseInt(e.target.value) })}>
              <option value={10}>10 Litres</option>
              <option value={20}>20 Litres</option>
            </select>
          </div>
          <div>
            <label className="label">Refill Frequency (days)</label>
            <input type="number" className="input-field" value={form.refillFrequency} onChange={(e) => setForm({ ...form, refillFrequency: parseInt(e.target.value) || 7 })} min="1" />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, customer: null })}
        onConfirm={handleDelete}
        title="Deactivate Customer"
        message={`Are you sure you want to deactivate ${deleteDialog.customer?.name}? They will no longer be able to login.`}
        confirmLabel="Deactivate"
      />
    </div>
  );
};

export default CustomersPage;
