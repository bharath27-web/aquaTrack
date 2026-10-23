import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, trendLabel, description, loading }) => {
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-primary-700', icon: 'bg-primary-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'bg-green-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'bg-yellow-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'bg-red-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'bg-purple-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'bg-cyan-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-100' },
  };

  const colors = colorMap[color] || colorMap.blue;

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="skeleton h-10 w-10 rounded-lg"></div>
          <div className="flex-1 ml-4">
            <div className="skeleton h-4 w-24 mb-2"></div>
            <div className="skeleton h-8 w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card group hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${colors.icon} group-hover:scale-110 transition-transform duration-200`}>
          {Icon && <Icon size={22} className={colors.text} />}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-muted">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${colors.text}`}>{value ?? '—'}</p>
        {(description || trendLabel) && (
          <p className="text-xs text-muted mt-1">{trendLabel || description}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
