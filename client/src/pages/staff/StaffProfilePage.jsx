import React, { useState, useEffect } from 'react';
import { staffAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { getInitials, getAvatarColor, formatDate } from '../../utils/helpers';
import { User, Phone, Mail, Truck, MapPin, Star, Package, CheckCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const StaffProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ vehicleNumber: '', vehicleType: 'van', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        // Try /staff/me first (works for staff role)
        const res = await staffAPI.getMe();
        setStaff(res.data);
        setForm({
          vehicleNumber: res.data.vehicleNumber || '',
          vehicleType: res.data.vehicleType || 'van',
          phone: res.data.phone || '',
        });
      } catch (err) {
        // Fallback: try using staffId from user object
        if (user?.staffId) {
          try {
            const res = await staffAPI.getOne(user.staffId);
            setStaff(res.data);
            setForm({
              vehicleNumber: res.data.vehicleNumber || '',
              vehicleType: res.data.vehicleType || 'van',
              phone: res.data.phone || '',
            });
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [user?.staffId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const staffId = staff?._id || user?.staffId;
      if (!staffId) {
        toast.error('Staff profile not found. Please try again.');
        return;
      }
      const res = await staffAPI.update(staffId, form);
      setStaff(res.data);
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card skeleton h-48" />
        <div className="card skeleton h-32" />
      </div>
    );
  }

  const vehicleTypeLabels = { bike: 'Bike', auto: 'Auto', van: 'Van', truck: 'Truck' };

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="My Profile"
        subtitle="Your staff account information"
        actions={
          !editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary">Edit Profile</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )
        }
      />

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-start gap-5">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 ${getAvatarColor(user?.name)}`}>
            {getInitials(user?.name)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">Delivery Staff</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{staff?.staffId}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${staff?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {staff?.status || 'active'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Mail size={16} className="text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Email</p>
              <p className="text-sm font-medium text-slate-800">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Phone size={16} className="text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Phone</p>
              {editing ? (
                <input className="input-field text-sm py-1 mt-0.5" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              ) : (
                <p className="text-sm font-medium text-slate-800">{staff?.phone || user?.phone || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="card">
        <h3 className="section-title mb-4">Vehicle Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Vehicle Number</label>
            {editing ? (
              <input className="input-field" placeholder="e.g. TN01AB1234" value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Truck size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-800">{staff?.vehicleNumber || 'Not set'}</span>
              </div>
            )}
          </div>
          <div>
            <label className="label">Vehicle Type</label>
            {editing ? (
              <select className="input-field" value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                <option value="bike">Bike</option>
                <option value="auto">Auto</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </select>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Truck size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-800">{vehicleTypeLabels[staff?.vehicleType] || 'Van'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="card">
        <h3 className="section-title mb-4">Performance Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-[#0284C7]">{staff?.totalDeliveries || 0}</p>
            <p className="text-xs text-muted mt-1">Total Assigned</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-600">{staff?.completedDeliveries || 0}</p>
            <p className="text-xs text-muted mt-1">Completed</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-xl">
            <p className="text-2xl font-bold text-amber-500">{staff?.averageRating?.toFixed(1) || '—'}</p>
            <p className="text-xs text-muted mt-1 flex items-center justify-center gap-1"><Star size={10} className="text-amber-500" />Avg Rating</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <p className="text-2xl font-bold text-purple-600">{staff?.totalRatings || 0}</p>
            <p className="text-xs text-muted mt-1">Reviews</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-slate-500 flex items-center gap-2">
          <Calendar size={14} />
          <span>Joined: {formatDate(staff?.joinedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default StaffProfilePage;
