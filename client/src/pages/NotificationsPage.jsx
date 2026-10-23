import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import PageHeader from '../components/PageHeader';
import { formatDateTime } from '../utils/helpers';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll();
      setNotifications(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  const markAllRead = async () => {
    await notificationAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const typeIcons = {
    delivery_assigned: '📋', delivery_on_way: '🚚', delivery_arrived: '📍',
    delivery_completed: '✅', refill_due: '💧', damage_reported: '⚠️', payment_due: '💳', general: '🔔',
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        actions={
          <button onClick={markAllRead} className="btn-secondary text-sm">
            <CheckCheck size={14} /> Mark all read
          </button>
        }
      />
      <div className="card p-0 overflow-hidden divide-y divide-gray-50">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="p-4 skeleton h-16"></div>)
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-muted">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n._id} className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
              <span className="text-xl flex-shrink-0 mt-0.5">{typeIcons[n.type] || '🔔'}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${!n.isRead ? 'text-dark' : 'text-gray-600'}`}>{n.title}</p>
                <p className="text-xs text-muted mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 bg-primary-700 rounded-full mt-2 flex-shrink-0"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
