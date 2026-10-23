import React, { useState, useEffect, useCallback } from 'react';
import { returnAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { RotateCcw, Package } from 'lucide-react';

const StaffReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await returnAPI.getAll({ page, limit: 10 });
      setReturns(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Can Returns"
        subtitle={`${pagination.total || 0} return records`}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-[#0284C7]">
            {returns.reduce((sum, r) => sum + (r.cansDelivered || 0), 0)}
          </p>
          <p className="text-xs text-muted mt-1">Total Delivered</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-emerald-600">
            {returns.reduce((sum, r) => sum + (r.cansReturned || 0), 0)}
          </p>
          <p className="text-xs text-muted mt-1">Total Returned</p>
        </div>
        <div className="card text-center py-4 col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-amber-500">
            {returns.reduce((sum, r) => sum + (r.cansPending || 0), 0)}
          </p>
          <p className="text-xs text-muted mt-1">Pending Returns</p>
        </div>
      </div>

      {/* Returns Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Return ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Delivery</th>
                <th className="table-header">Delivered</th>
                <th className="table-header">Returned</th>
                <th className="table-header">Pending</th>
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="table-cell"><div className="skeleton h-4 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="No return records" description="Return records will appear here after deliveries." icon={RotateCcw} />
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell font-mono text-xs text-primary-700">{r.returnId}</td>
                    <td className="table-cell">
                      <p className="font-medium text-dark text-sm">{r.customerId?.name}</p>
                      <p className="text-xs text-muted">{r.customerId?.phone}</p>
                    </td>
                    <td className="table-cell font-mono text-xs text-muted">{r.deliveryId?.deliveryId || 'N/A'}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-[#0284C7]">{r.cansDelivered}</span>
                      <span className="text-xs text-muted ml-1">cans</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-emerald-600">{r.cansReturned}</span>
                      <span className="text-xs text-muted ml-1">cans</span>
                    </td>
                    <td className="table-cell">
                      <span className={`font-semibold ${r.cansPending > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {r.cansPending}
                      </span>
                      <span className="text-xs text-muted ml-1">cans</span>
                    </td>
                    <td className="table-cell text-sm text-muted">{formatDate(r.returnedAt || r.createdAt)}</td>
                    <td className="table-cell">
                      <StatusBadge status={r.status} type="return" />
                    </td>
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

export default StaffReturnsPage;
