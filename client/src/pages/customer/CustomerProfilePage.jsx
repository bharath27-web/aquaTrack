import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { getInitials, getAvatarColor, formatDate } from '../../utils/helpers';
import { User, Phone, Mail, MapPin, Building2, Droplets, Calendar, Edit2, Save, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CustomerProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', pincode: '' });
  const [saving, setSaving] = useState(false);
  const profile = user?.profile;

  useEffect(() => {
    if (user && profile) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        pincode: profile.pincode || '',
      });
    }
  }, [user, profile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!user?.customerId) {
        toast.error('Profile not found. Please try again.');
        return;
      }
      // Update customer profile
      const res = await api.put(`/customers/${user.customerId}`, {
        name: form.name,
        phone: form.phone,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
      });

      if (res.success) {
        // Update auth context
        updateUser({
          ...user,
          name: form.name,
          phone: form.phone,
          profile: { ...profile, ...form },
        });
        toast.success('Profile updated successfully!');
        setEditing(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="My Profile"
        subtitle="Your AquaTrack account details"
        actions={
          !editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
              <Edit2 size={15} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-2">
                <X size={15} /> Cancel
              </button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-2" disabled={saving}>
                <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )
        }
      />

      {/* Profile Header Card */}
      <div className="card bg-gradient-to-br from-[#0284C7]/5 to-[#06B6D4]/5 border border-[#0284C7]/20">
        <div className="flex items-start gap-5">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 ${getAvatarColor(user?.name)}`}>
            {getInitials(user?.name)}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                className="input-field text-lg font-bold mb-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full Name"
              />
            ) : (
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            )}
            <p className="text-sm text-slate-500">AquaTrack Customer</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {profile?.customerId}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {profile?.status || 'active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="card">
        <h3 className="section-title mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Email Address</label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Mail size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-600">{user?.email}</span>
              <span className="ml-auto text-xs text-muted">(read-only)</span>
            </div>
          </div>
          <div>
            <label className="label">Phone Number</label>
            {editing ? (
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Phone size={15} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">{profile?.phone || user?.phone || 'Not set'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="card">
        <h3 className="section-title mb-4">Delivery Address</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Street Address</label>
            {editing ? (
              <input
                className="input-field"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">{profile?.address || 'Not set'}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City</label>
              {editing ? (
                <input
                  className="input-field"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <Building2 size={15} className="text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{profile?.city || 'Not set'}</span>
                </div>
              )}
            </div>
            <div>
              <label className="label">Pincode</label>
              {editing ? (
                <input
                  className="input-field"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="Pincode"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-sm text-slate-700">{profile?.pincode || 'Not set'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Service Information */}
      <div className="card">
        <h3 className="section-title mb-4">Service Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <Droplets size={18} className="text-[#0284C7] mx-auto mb-1" />
            <p className="text-2xl font-bold text-[#0284C7]">{profile?.canCount || 0}</p>
            <p className="text-xs text-muted mt-1">Can Balance</p>
          </div>
          <div className="text-center p-3 bg-cyan-50 rounded-xl">
            <Calendar size={18} className="text-cyan-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-cyan-600">{profile?.refillFrequency || 7}</p>
            <p className="text-xs text-muted mt-1">Day Cycle</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-600">{profile?.totalDeliveries || 0}</p>
            <p className="text-xs text-muted mt-1">Total Deliveries</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <p className="text-2xl font-bold text-purple-600">{profile?.canCapacity || 20}L</p>
            <p className="text-xs text-muted mt-1">Can Capacity</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-slate-500 flex items-center gap-2">
          <Calendar size={14} />
          <span>Member since: {formatDate(profile?.joinedAt || user?.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
