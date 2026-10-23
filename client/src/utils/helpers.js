// Format currency in INR
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Format date
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  const defaultOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(date).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
};

// Format time
export const formatTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// Format date and time
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return `${formatDate(date)} at ${formatTime(date)}`;
};

// Delivery status config
export const DELIVERY_STATUS = {
  pending: { label: 'Pending', color: 'badge-yellow', dotColor: 'bg-yellow-400', icon: '⏳' },
  assigned: { label: 'Assigned', color: 'badge-blue', dotColor: 'bg-blue-400', icon: '📋' },
  on_the_way: { label: 'On The Way', color: 'badge-orange', dotColor: 'bg-orange-400', icon: '🚚' },
  arrived: { label: 'Arrived', color: 'badge-purple', dotColor: 'bg-purple-400', icon: '📍' },
  delivered: { label: 'Delivered', color: 'badge-green', dotColor: 'bg-green-400', icon: '✅' },
  failed: { label: 'Failed', color: 'badge-red', dotColor: 'bg-red-400', icon: '❌' },
  cancelled: { label: 'Cancelled', color: 'badge-gray', dotColor: 'bg-gray-400', icon: '🚫' },
  rescheduled: { label: 'Rescheduled', color: 'badge-purple', dotColor: 'bg-purple-400', icon: '📅' },
};

// Customer status config
export const CUSTOMER_STATUS = {
  active: { label: 'Active', color: 'badge-green' },
  inactive: { label: 'Inactive', color: 'badge-gray' },
  suspended: { label: 'Suspended', color: 'badge-red' },
};

// Staff status config
export const STAFF_STATUS = {
  active: { label: 'Active', color: 'badge-green' },
  inactive: { label: 'Inactive', color: 'badge-gray' },
  on_leave: { label: 'On Leave', color: 'badge-yellow' },
};

// Damage reason labels
export const DAMAGE_REASONS = {
  cracked: 'Cracked',
  broken: 'Broken',
  leakage: 'Leakage',
  missing_cap: 'Missing Cap',
  physical_damage: 'Physical Damage',
  other: 'Other',
};

// Refill status config
export const REFILL_STATUS = {
  scheduled: { label: 'Scheduled', color: 'badge-blue' },
  due: { label: 'Due', color: 'badge-red' },
  completed: { label: 'Completed', color: 'badge-green' },
  rescheduled: { label: 'Rescheduled', color: 'badge-yellow' },
  skipped: { label: 'Skipped', color: 'badge-gray' },
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

// Calculate days until date
export const daysUntil = (date) => {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Truncate text
export const truncate = (text, length = 50) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

// Generate avatar color from name
export const getAvatarColor = (name) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500',
  ];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};
