import React, { useState, useEffect } from 'react';
import { returnAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/helpers';
import { RotateCcw } from 'lucide-react';

const ReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const fetchReturns = async () => {
      try {
        setLoading(true);
        const res = await returnAPI.getAll({ page, limit: 10 });
        setReturns(res.data || []);
        setPagination(res.pagination || {});
      } catch {} finally { setLoading(false); }
    };
    fetchReturns();
  }, [page]);

  return (
    <div className="space-y-6">
      <PageHeader title="Can Returns" subtitle={`${pagination.total || 0} return records`} />
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Return ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Staff</th>
                <th className="table-header">Delivery</th>
                <th className="table-header">Delivered</th>
                <th className="table-header">Returned</th>
                <th className="table-header">Pending</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded"></div></td>)}</tr>)
              ) : returns.length === 0 ? (
                <tr><td colSpan={9}><EmptyState title="No return records" icon={RotateCcw} /></td></tr>
              ) : (
                returns.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50">
                    <td className="table-cell font-mono text-xs text-primary-700">{r.returnId}</td>
                    <td className="table-cell font-medium">{r.customerId?.name || 'N/A'}</td>
                    <td className="table-cell text-muted text-sm">{r.staffId?.name || 'N/A'}</td>
                    <td className="table-cell font-mono text-xs">{r.deliveryId?.deliveryId}</td>
                    <td className="table-cell"><span className="font-semibold text-primary-700">{r.cansDelivered}</span></td>
                    <td className="table-cell"><span className="font-semibold text-success">{r.cansReturned}</span></td>
                    <td className="table-cell">
                      <span className={`font-semibold ${r.cansPending > 0 ? 'text-warning' : 'text-success'}`}>
                        {r.cansPending}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={r.status === 'complete' ? 'badge-green' : 'badge-yellow'}>{r.status}</span>
                    </td>
                    <td className="table-cell text-sm">{formatDate(r.returnedAt)}</td>
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

export default ReturnsPage;
