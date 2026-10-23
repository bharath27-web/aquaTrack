import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Truck, UserCheck, Map, RotateCcw,
  AlertTriangle, RefreshCw, CreditCard, BarChart2, Bell, Settings,
  LogOut, Menu, X, Droplets, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';
import { getInitials, getAvatarColor } from '../utils/helpers';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Customers', icon: Users, path: '/admin/customers' },
  { label: 'Deliveries', icon: Truck, path: '/admin/deliveries' },
  { label: 'Delivery Staff', icon: UserCheck, path: '/admin/staff' },
  { label: 'Live Map', icon: Map, path: '/admin/live-map' },
  { label: 'Returns', icon: RotateCcw, path: '/admin/returns' },
  { label: 'Damaged Cans', icon: AlertTriangle, path: '/admin/damages' },
  { label: 'Refills', icon: RefreshCw, path: '/admin/refills' },
  { label: 'Payments', icon: CreditCard, path: '/admin/payments' },
  { label: 'Analytics', icon: BarChart2, path: '/admin/analytics' },
  { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

const AdminLayout = ({ children }) => {
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
      {/* Logo */}
      <div className="p-6 border-b border-blue-800/50">
        <Link to="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-lg">
            <Droplets size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">AquaTrack</h1>
            <p className="text-xs text-blue-300 mt-0.5">Admin Portal</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={17} className={isActive ? 'text-accent' : 'text-blue-300 group-hover:text-accent'} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-accent" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-blue-800/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(user?.name)}`}>
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-blue-300">Administrator</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-blue-300 hover:text-red-300 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 bg-primary-700">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 flex flex-col bg-primary-700 animate-slide-in">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <Menu size={20} />
            </button>
            {/* Breadcrumb hint */}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-500">
                {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown userRole="admin" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(user?.name)}`}>
              {getInitials(user?.name)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
