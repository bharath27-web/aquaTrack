import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} border-4 border-gray-200 border-t-primary-700 rounded-full animate-spin`}></div>
    </div>
  );
};

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-surface">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-primary-700 rounded-full animate-spin"></div>
      <div className="flex items-center gap-2">
        <span className="text-2xl">💧</span>
        <span className="text-lg font-bold text-primary-700">AquaTrack</span>
      </div>
      <p className="text-sm text-muted">Loading...</p>
    </div>
  </div>
);

export default LoadingSpinner;
