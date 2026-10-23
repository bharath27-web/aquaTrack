import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Navigation, RefreshCw, RotateCcw, CreditCard, Bell, User, LogOut, Menu, X, Droplets,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';
import { getInitials, getAvatarColor } from '../utils/helpers';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/customer/dashboard' },
  { label: 'My Deliveries', icon: Truck, path: '/customer/deliveries' },
  { label: 'Track Delivery', icon: Navigation, path: '/customer/track' },
  { label: 'Refills', icon: RefreshCw, path: '/customer/refills' },
  { label: 'Returns', icon: RotateCcw, path: '/customer/returns' },
  { label: 'Payments', icon: CreditCard, path: '/customer/payments' },
  { label: 'Notifications', icon: Bell, path: '/customer/notifications' },
  { label: 'Profile', icon: User, path: '/customer/profile' },
];

const CustomerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-cyan-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Droplets size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">AquaTrack</h1>
            <p className="text-xs text-cyan-200">My Account</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive ? 'bg-white/15 text-white' : 'text-cyan-100 hover:bg-white/10 hover:text-white'}`}>
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="p-4 border-t border-cyan-700/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(user?.name)}`}>
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-cyan-200">Customer</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 hover:bg-red-500/20 rounded-lg text-cyan-200 hover:text-red-300 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <aside className="hidden lg:flex w-60 flex-col flex-shrink-0 bg-accent-dark">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col bg-accent-dark animate-slide-in">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg text-white">
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <Menu size={20} />
            </button>
            <p className="text-sm font-medium text-gray-500">{navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown userRole="customer" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(user?.name)}`}>
              {getInitials(user?.name)}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default CustomerLayout;
