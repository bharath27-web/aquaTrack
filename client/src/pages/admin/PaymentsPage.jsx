import React, { useState, useEffect } from 'react';
import { paymentAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { CreditCard } from 'lucide-react';

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await paymentAPI.getAll({ page, limit: 10 });
        setPayments(res.data || []);
        setPagination(res.pagination || {});
      } catch {} finally { setLoading(false); }
    };
    fetch();
  }, [page]);

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" subtitle={`${pagination.total || 0} payment records`} />
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Payment ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Delivery</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Type</th>
                <th className="table-header">Method</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded"></div></td>)}</tr>)
              ) : payments.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No payment records" icon={CreditCard} /></td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/50">
                    <td className="table-cell font-mono text-xs text-primary-700">{p.paymentId}</td>
                    <td className="table-cell font-medium">{p.customerId?.name || 'N/A'}</td>
                    <td className="table-cell font-mono text-xs">{p.deliveryId?.deliveryId || '—'}</td>
                    <td className="table-cell font-semibold text-dark">{formatCurrency(p.amount)}</td>
                    <td className="table-cell"><span className="badge badge-blue capitalize">{p.type}</span></td>
                    <td className="table-cell capitalize text-sm text-muted">{p.method.replace('_', ' ')}</td>
                    <td className="table-cell"><StatusBadge status={p.status} type="payment" /></td>
                    <td className="table-cell text-sm">{formatDate(p.createdAt)}</td>
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

export default PaymentsPage;
