import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Star, MapPin } from 'lucide-react';
import { staffAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { getInitials, getAvatarColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { UserCheck } from 'lucide-react';

const initialForm = { name: '', email: '', phone: '', password: 'staff123', vehicleNumber: '', vehicleType: 'van', lat: '', lng: '' };

const StaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await staffAPI.getAll({ search, page, limit: 10 });
      setStaff(res.data || []);
      setPagination(res.pagination || {});
    } catch {} finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleCreate = async (e) => {
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

      await staffAPI.create(payload);
      toast.success('Staff member created');
      setShowModal(false);
      setForm(initialForm);
      fetchStaff();
    } catch (err) { toast.error(err.message); } finally { setFormLoading(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Staff"
        subtitle={`${pagination.total || 0} staff members`}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Add Staff
          </button>
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, vehicle..." className="max-w-sm" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="card skeleton h-48"></div>)
        ) : staff.length === 0 ? (
          <div className="col-span-3"><EmptyState title="No staff found" icon={UserCheck} /></div>
        ) : (
          staff.map((s) => (
            <div key={s._id} className="card hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(s.name)}`}>
                    {getInitials(s.name)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark">{s.name}</h3>
                    <p className="text-xs text-muted font-mono">{s.staffId}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={s.status} type="staff" />
                  {s.isOnDuty && <span className="badge badge-green text-xs">On Duty</span>}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <span>📱</span> {s.phone}
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <span>🚐</span> {s.vehicleNumber || 'No vehicle'} · {s.vehicleType}
                </div>
                {s.currentLocation?.lat && (
                  <div className="flex items-center gap-2 text-muted">
                    <MapPin size={13} /> Last seen: {new Date(s.currentLocation.updatedAt).toLocaleTimeString('en-IN')}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-dark">{s.totalDeliveries}</p>
                  <p className="text-xs text-muted">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-success">{s.completedDeliveries}</p>
                  <p className="text-xs text-muted">Done</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <Star size={13} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-lg font-bold text-dark">{s.averageRating?.toFixed(1) || '—'}</span>
                  </div>
                  <p className="text-xs text-muted">Rating</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination currentPage={page} totalPages={pagination.pages || 1} onPageChange={setPage} totalItems={pagination.total || 0} itemsPerPage={10} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Delivery Staff" size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={formLoading}>{formLoading ? 'Creating...' : 'Add Staff'}</button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
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
          <div>
            <label className="label">Password</label>
            <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vehicle Number</label>
              <input className="input-field" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="TN-XX-XXXX" />
            </div>
            <div>
              <label className="label">Vehicle Type</label>
              <select className="input-field" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                <option value="van">Van</option>
                <option value="auto">Auto</option>
                <option value="bike">Bike</option>
                <option value="truck">Truck</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffPage;
