import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { notificationAPI } from '../services/api';
import { formatDateTime } from '../utils/helpers';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';

const NotificationDropdown = ({ userRole }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { on } = useSocket();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const cleanup = on('notificationCreated', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
    return cleanup;
  }, [on]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll();
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {} finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    await notificationAPI.markRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationAPI.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const typeIcons = {
    delivery_assigned: '📋',
    delivery_on_way: '🚚',
    delivery_arrived: '📍',
    delivery_completed: '✅',
    refill_due: '💧',
    damage_reported: '⚠️',
    payment_due: '💳',
    general: '🔔',
  };

  const notifPath = userRole === 'admin' ? '/admin' : userRole === 'staff' ? '/staff' : '/customer';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-dark">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-700 hover:underline flex items-center gap-1">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-14 rounded-lg"></div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-muted">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                >
                  <span className="text-lg flex-shrink-0">{typeIcons[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-dark' : 'text-gray-600'}`}>{n.title}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-primary-700 rounded-full mt-1 flex-shrink-0"></div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <Link to={`${notifPath}/notifications`} onClick={() => setOpen(false)} className="text-xs text-primary-700 hover:underline">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
