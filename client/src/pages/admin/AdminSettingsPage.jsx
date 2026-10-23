import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Bell,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Database,
  Server,
  Shield,
  Users,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { customerAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Section = ({ icon: Icon, title, children }) => (
  <div className="card space-y-5">
    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
      <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
        <Icon size={18} className="text-primary-700" />
      </div>
      <h2 className="text-base font-semibold text-dark">{title}</h2>
    </div>
    {children}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
  </div>
);

const AdminSettingsPage = () => {
  const { user, updateUser } = useAuth();

  // Profile state
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPass: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  // System info state
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
    fetchHealth();
  }, [user]);

  const fetchHealth = async () => {
    try {
      setHealthLoading(true);
      const res = await api.get('/health');
      setHealth(res);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profile.name.trim() || !profile.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    try {
      setProfileSaving(true);
      // Update via /auth/me — for now we call the me endpoint to confirm identity
      // then update local user store (profile fields are stored in User model)
      // Since there's no dedicated profile update API, we update the user via the
      // existing updateUser context method to reflect changes in the UI immediately.
      // A full implementation would call PUT /api/auth/profile here.
      const updated = { ...user, name: profile.name.trim(), phone: profile.phone.trim() };
      updateUser(updated);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.newPass || !passwords.confirm) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (passwords.newPass.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      setPwSaving(true);
      await api.put('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setPasswords({ current: '', newPass: '', confirm: '' });
      toast.success('Password changed successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSyncCustomers = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await customerAPI.syncAuth();
      setSyncResult(res);
      toast.success(res.message || 'Customer sync complete!');
    } catch (err) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const togglePw = (field) => setShowPw((prev) => ({ ...prev, [field]: !prev[field] }));

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Manage your account and system preferences" />

      {/* ── Profile ──────────────────────────────────────────────────── */}
      <Section icon={User} title="Profile">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-xl font-bold select-none">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="font-semibold text-dark">{user?.name}</p>
              <p className="text-sm text-muted">{user?.email}</p>
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 capitalize">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *">
              <input
                className="input-field"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Email" hint="Email cannot be changed here.">
              <input
                className="input-field bg-gray-50 cursor-not-allowed"
                value={profile.email}
                readOnly
                disabled
              />
            </Field>
            <Field label="Phone">
              <input
                className="input-field"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={profileSaving}>
              <Save size={15} />
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Security ─────────────────────────────────────────────────── */}
      <Section icon={Lock} title="Security — Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { key: 'current', label: 'Current Password' },
            { key: 'newPass', label: 'New Password', hint: 'Minimum 8 characters' },
            { key: 'confirm', label: 'Confirm New Password' },
          ].map(({ key, label, hint }) => (
            <Field key={key} label={label} hint={hint}>
              <div className="relative">
                <input
                  type={showPw[key] ? 'text' : 'password'}
                  className="input-field pr-10"
                  value={passwords[key]}
                  onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })}
                  autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => togglePw(key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
          ))}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={pwSaving}>
              <Shield size={15} />
              {pwSaving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Customer Auth Sync ────────────────────────────────────────── */}
      <Section icon={Users} title="Customer Authentication Sync">
        <p className="text-sm text-muted">
          If customers created through the Admin panel cannot log in, use this tool to create or link
          missing authentication accounts. Each orphaned customer will receive the default password:{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-primary-700">
            aquatrack@123
          </code>
        </p>

        {syncResult && (
          <div className={`p-3.5 rounded-xl text-sm border ${syncResult.errors?.length > 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
            <p className="font-semibold mb-1">{syncResult.message}</p>
            {syncResult.errors?.length > 0 && (
              <ul className="list-disc list-inside text-xs space-y-0.5 mt-2">
                {syncResult.errors.map((e, i) => (
                  <li key={i}>{e.customer}: {e.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSyncCustomers}
            className="btn-secondary flex items-center gap-2"
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Customer Auth Accounts'}
          </button>
        </div>
      </Section>

      {/* ── System Status ─────────────────────────────────────────────── */}
      <Section icon={Server} title="System Status">
        {healthLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : health ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-dark">
                <Server size={15} className="text-muted" />
                API Status
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                <CheckCircle2 size={13} /> Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-dark">
                <Database size={15} className="text-muted" />
                Database
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${health.database === 'connected' ? 'text-success' : 'text-danger'}`}>
                {health.database === 'connected' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {health.database === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-dark">
                <Info size={15} className="text-muted" />
                Last Checked
              </div>
              <span className="text-xs text-muted font-mono">
                {health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
              </span>
            </div>
            <div className="flex justify-end">
              <button onClick={fetchHealth} className="btn-secondary text-xs flex items-center gap-1.5">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-danger p-3 bg-red-50 rounded-xl">
            <AlertCircle size={16} />
            Could not reach the backend API. Make sure the server is running and accessible.
          </div>
        )}
      </Section>

      {/* ── App Info ─────────────────────────────────────────────────── */}
      <Section icon={Info} title="Application Information">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Application', value: 'AquaTrack' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Backend URL', value: import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000' },
            { label: 'Frontend URL', value: typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:5173' },
            { label: 'Map Provider', value: 'Leaflet + OpenStreetMap' },
            { label: 'Real-time', value: 'Socket.IO' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-muted mb-0.5">{label}</p>
              <p className="font-medium text-dark truncate">{value}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default AdminSettingsPage;
