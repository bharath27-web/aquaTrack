import React from 'react';
import { Package } from 'lucide-react';

const EmptyState = ({ title = 'No data found', description = 'There is nothing here yet.', icon: Icon = Package, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="p-4 bg-gray-100 rounded-full mb-4">
      <Icon size={32} className="text-gray-400" />
    </div>
    <h3 className="text-base font-semibold text-dark mb-1">{title}</h3>
    <p className="text-sm text-muted max-w-xs">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
