import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmClass = 'btn-danger', loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-dark">{title}</h3>
            <p className="text-sm text-muted mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className={confirmClass} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
