import React, { useState, useEffect } from 'react';
import { damageAPI, deliveryAPI, staffAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatDate, DAMAGE_REASONS } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { AlertTriangle, Upload, X } from 'lucide-react';

const StaffDamagesPage = () => {
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [staffData, setStaffData] = useState(null);
  const [form, setForm] = useState({ deliveryId: '', damagedCans: 1, damageReason: 'cracked', description: '', chargePerCan: 200 });
  const [photos, setPhotos] = useState([]);
  const [photoPreview, setPhotoPreview] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dmgRes, dRes, staffRes] = await Promise.all([
        damageAPI.getAll({ limit: 20 }),
        deliveryAPI.getToday(),
        staffAPI.getAll({ limit: 1 }),
      ]);
      setDamages(dmgRes.data || []);
      setDeliveries(dRes.data?.filter(d => d.status === 'delivered') || []);
      const staff = staffRes.data?.[0];
      setStaffData(staff);
    } catch {} finally { setLoading(false); }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(files);
    const previews = files.map(f => URL.createObjectURL(f));
    setPhotoPreview(previews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.deliveryId) { toast.error('Please select a delivery'); return; }
    try {
      setFormLoading(true);
      const delivery = deliveries.find(d => d._id === form.deliveryId);
      if (!delivery) { toast.error('Delivery not found'); return; }

      const formData = new FormData();
      formData.append('deliveryId', form.deliveryId);
      formData.append('customerId', delivery.customerId?._id || delivery.customerId);
      formData.append('staffId', staffData?._id || '');
      formData.append('damagedCans', form.damagedCans);
      formData.append('damageReason', form.damageReason);
      formData.append('description', form.description);
      formData.append('chargePerCan', form.chargePerCan);
      photos.forEach(p => formData.append('photos', p));

      await damageAPI.create(formData);
      toast.success('Damage report submitted');
      setShowModal(false);
      setPhotos([]);
      setPhotoPreview([]);
      setForm({ deliveryId: '', damagedCans: 1, damageReason: 'cracked', description: '', chargePerCan: 200 });
      fetchData();
    } catch (err) { toast.error(err.message || 'Failed to submit report'); } finally { setFormLoading(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Damage Reports"
        actions={
          <button onClick={() => setShowModal(true)} className="btn-danger">
            <AlertTriangle size={15} /> Report Damage
          </button>
        }
      />

      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="card skeleton h-24"></div>)
        ) : damages.length === 0 ? (
          <EmptyState title="No damage reports" description="No damages have been reported." icon={AlertTriangle} />
        ) : (
          damages.map((d) => (
            <div key={d._id} className="card">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{d.customerId?.name || 'N/A'}</p>
                  <p className="text-xs text-muted">{d.damageId} · {formatDate(d.reportedAt)}</p>
                </div>
                <StatusBadge status={d.status} type="damage" />
              </div>
              <div className="flex gap-3 text-sm">
                <span className="badge badge-red">{DAMAGE_REASONS[d.damageReason]}</span>
                <span className="text-muted">{d.damagedCans} cans</span>
                <span className="font-medium text-danger">₹{d.totalCharge}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Report Damaged Cans" size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-danger" onClick={handleSubmit} disabled={formLoading}>{formLoading ? 'Submitting...' : 'Submit Report'}</button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="label">Select Delivered Delivery *</label>
            <select className="input-field" value={form.deliveryId} onChange={(e) => setForm({ ...form, deliveryId: e.target.value })} required>
              <option value="">Select delivery</option>
              {deliveries.map(d => <option key={d._id} value={d._id}>{d.customerId?.name} – {d.deliveryId}</option>)}
            </select>
            {deliveries.length === 0 && <p className="text-xs text-warning mt-1">Complete a delivery first before reporting damage.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Damaged Cans *</label>
              <input type="number" className="input-field" value={form.damagedCans} onChange={(e) => setForm({ ...form, damagedCans: parseInt(e.target.value) || 1 })} min="1" />
            </div>
            <div>
              <label className="label">Charge per Can (₹)</label>
              <input type="number" className="input-field" value={form.chargePerCan} onChange={(e) => setForm({ ...form, chargePerCan: parseInt(e.target.value) || 200 })} min="0" />
            </div>
          </div>
          <div>
            <label className="label">Damage Reason *</label>
            <select className="input-field" value={form.damageReason} onChange={(e) => setForm({ ...form, damageReason: e.target.value })}>
              {Object.entries(DAMAGE_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the damage..." />
          </div>
          <div>
            <label className="label">Photos (up to 5)</label>
            <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-700 transition-colors">
              <Upload size={18} className="text-gray-400" />
              <span className="text-sm text-muted">Click to upload photos</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
            </label>
            {photoPreview.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {photoPreview.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-sm font-medium text-orange-700">Estimated Charge: ₹{form.damagedCans * form.chargePerCan}</p>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffDamagesPage;
