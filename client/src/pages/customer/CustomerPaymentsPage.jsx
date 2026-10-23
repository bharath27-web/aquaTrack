import React, { useState, useEffect, useCallback } from 'react';
import { paymentAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const paymentMethodLabels = { cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', card: 'Card' };
const paymentMethodIcons = { cash: '💵', upi: '📱', bank_transfer: '🏦', card: '💳' };

const CustomerPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();
  const profile = user?.profile;

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await paymentAPI.getAll({ page, limit: 10, status: statusFilter });
      setPayments(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Payment History" subtitle={`${pagination.total || 0} payment records`} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Total Paid</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>

        <div className={`card border-l-4 ${profile?.outstandingBalance > 0 ? 'border-red-400' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${profile?.outstandingBalance > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertCircle size={18} className={profile?.outstandingBalance > 0 ? 'text-red-500' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Outstanding Balance</p>
              <p className={`text-xl font-bold ${profile?.outstandingBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {formatCurrency(profile?.outstandingBalance || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-[#0284C7]" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Pending Payments</p>
              <p className="text-xl font-bold text-amber-500">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Balance Alert */}
      {profile?.outstandingBalance > 0 && (
        <div className="card bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">Payment Due</p>
              <p className="text-sm text-red-600">
                You have an outstanding balance of <strong>{formatCurrency(profile.outstandingBalance)}</strong>. Please clear your dues promptly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === tab.value ? 'bg-[#0284C7] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Payment ID</th>
                <th className="table-header">Delivery</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Method</th>
                <th className="table-header">Type</th>
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded" /></td>)}</tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No payment records" description="Payment history will appear here after deliveries." icon={CreditCard} />
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell font-mono text-xs text-primary-700">{p.paymentId}</td>
                    <td className="table-cell font-mono text-xs text-muted">{p.deliveryId?.deliveryId || '—'}</td>
                    <td className="table-cell">
                      <span className={`font-bold ${p.status === 'completed' ? 'text-emerald-600' : p.status === 'pending' ? 'text-amber-500' : 'text-gray-500'}`}>
                        {formatCurrency(p.amount)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="flex items-center gap-1.5 text-sm">
                        <span>{paymentMethodIcons[p.method] || '💰'}</span>
                        <span className="text-muted">{paymentMethodLabels[p.method] || p.method}</span>
                      </span>
                    </td>
                    <td className="table-cell text-sm capitalize text-muted">{p.type}</td>
                    <td className="table-cell text-sm text-muted">{p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}</td>
                    <td className="table-cell"><StatusBadge status={p.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={pagination.pages || 1} onPageChange={setPage} totalItems={pagination.total || 0} itemsPerPage={10} />
      </div>
    </div>
  );
};

export default CustomerPaymentsPage;
