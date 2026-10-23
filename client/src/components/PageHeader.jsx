import React from 'react';

const PageHeader = ({ title, subtitle, actions, breadcrumb }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      {breadcrumb && (
        <p className="text-xs text-muted mb-1">{breadcrumb}</p>
      )}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && (
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
      </div>
    )}
  </div>
);

export default PageHeader;
