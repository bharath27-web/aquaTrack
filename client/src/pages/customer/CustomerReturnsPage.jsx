import React, { useState, useEffect, useCallback } from 'react';
import { returnAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { RotateCcw, Package } from 'lucide-react';

const CustomerReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [activeTab, setActiveTab] = useState('returns');
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'returns') {
        const res = await returnAPI.getAll({ page, limit: 10 });
        setReturns(res.data || []);
        setPagination(res.pagination || {});
      } else {
        const res = await api.get('/damages', { params: { page, limit: 10 } });
        setDamages(res.data || []);
        setPagination(res.pagination || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [activeTab]);

  return (
    <div className="space-y-5">
      <PageHeader title="Returns & Damages" subtitle="Your can return history and damage reports" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-[#0284C7]">{user?.profile?.totalDeliveries || 0}</p>
          <p className="text-xs text-muted mt-1">Total Deliveries</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-emerald-600">{user?.profile?.totalReturns || 0}</p>
          <p className="text-xs text-muted mt-1">Cans Returned</p>
        </div>
        <div className="card text-center py-4 col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-amber-500">{user?.profile?.totalDamagedCans || 0}</p>
          <p className="text-xs text-muted mt-1">Damaged Cans</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'returns' ? 'bg-[#0284C7] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Can Returns
        </button>
        <button
          onClick={() => setActiveTab('damages')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'damages' ? 'bg-[#0284C7] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Damage Reports
        </button>
      </div>

      {/* Returns Table */}
      {activeTab === 'returns' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Return ID</th>
                  <th className="table-header">Delivery</th>
                  <th className="table-header">Staff</th>
                  <th className="table-header">Delivered</th>
                  <th className="table-header">Returned</th>
                  <th className="table-header">Pending</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded" /></td>)}</tr>
                  ))
                ) : returns.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState title="No return records yet" icon={RotateCcw} /></td></tr>
                ) : (
                  returns.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell font-mono text-xs text-primary-700">{r.returnId}</td>
                      <td className="table-cell font-mono text-xs text-muted">{r.deliveryId?.deliveryId || 'N/A'}</td>
                      <td className="table-cell text-sm text-muted">{r.staffId?.name || '—'}</td>
                      <td className="table-cell"><span className="font-semibold text-[#0284C7]">{r.cansDelivered}</span><span className="text-xs text-muted ml-1">cans</span></td>
                      <td className="table-cell"><span className="font-semibold text-emerald-600">{r.cansReturned}</span><span className="text-xs text-muted ml-1">cans</span></td>
                      <td className="table-cell"><span className={`font-semibold ${r.cansPending > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>{r.cansPending}</span><span className="text-xs text-muted ml-1">cans</span></td>
                      <td className="table-cell text-sm text-muted">{formatDate(r.returnedAt || r.createdAt)}</td>
                      <td className="table-cell"><StatusBadge status={r.status} type="return" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={pagination.pages || 1} onPageChange={setPage} totalItems={pagination.total || 0} itemsPerPage={10} />
        </div>
      )}

      {/* Damages Table */}
      {activeTab === 'damages' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Damage ID</th>
                  <th className="table-header">Delivery</th>
                  <th className="table-header">Reason</th>
                  <th className="table-header">Cans Damaged</th>
                  <th className="table-header">Charges</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded" /></td>)}</tr>
                  ))
                ) : damages.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState title="No damage reports" icon={Package} /></td></tr>
                ) : (
                  damages.map((d) => (
                    <tr key={d._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell font-mono text-xs text-primary-700">{d.damageId}</td>
                      <td className="table-cell font-mono text-xs text-muted">{d.deliveryId?.deliveryId || 'N/A'}</td>
                      <td className="table-cell text-sm capitalize">{d.reason?.replace(/_/g, ' ') || '—'}</td>
                      <td className="table-cell"><span className="font-semibold text-red-500">{d.cansDamaged}</span></td>
                      <td className="table-cell"><span className="font-semibold">{d.charges > 0 ? `₹${d.charges}` : 'None'}</span></td>
                      <td className="table-cell text-sm text-muted">{formatDate(d.reportedAt || d.createdAt)}</td>
                      <td className="table-cell"><StatusBadge status={d.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={pagination.pages || 1} onPageChange={setPage} totalItems={pagination.total || 0} itemsPerPage={10} />
        </div>
      )}
    </div>
  );
};

export default CustomerReturnsPage;
