import React, { useState, useEffect } from 'react';
import { damageAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { formatDate, formatCurrency, DAMAGE_REASONS } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';

const DamagesPage = () => {
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [viewDamage, setViewDamage] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);

  const fetchDamages = async () => {
    try {
      setLoading(true);
      const res = await damageAPI.getAll({ status: statusFilter, page, limit: 10 });
      setDamages(res.data || []);
      setPagination(res.pagination || {});
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchDamages(); }, [statusFilter, page]);

  const handleReview = async (damage, status) => {
    try {
      await damageAPI.update(damage._id, { status, reviewNotes: `${status === 'approved' ? 'Approved' : 'Rejected'} by admin` });
      toast.success(`Damage report ${status}`);
      fetchDamages();
      setViewDamage(null);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Damaged Cans" subtitle={`${pagination.total || 0} damage reports`} />

      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="reported">Reported</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Report ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Staff</th>
                <th className="table-header">Reason</th>
                <th className="table-header">Cans</th>
                <th className="table-header">Charge</th>
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded"></div></td>)}</tr>)
              ) : damages.length === 0 ? (
                <tr><td colSpan={9}><EmptyState title="No damage reports" icon={AlertTriangle} /></td></tr>
              ) : (
                damages.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50/50">
                    <td className="table-cell font-mono text-xs text-primary-700">{d.damageId}</td>
                    <td className="table-cell font-medium">{d.customerId?.name || 'N/A'}</td>
                    <td className="table-cell text-muted text-sm">{d.staffId?.name || 'N/A'}</td>
                    <td className="table-cell">
                      <span className="badge badge-red">{DAMAGE_REASONS[d.damageReason] || d.damageReason}</span>
                    </td>
                    <td className="table-cell font-semibold text-danger">{d.damagedCans}</td>
                    <td className="table-cell font-medium">{formatCurrency(d.totalCharge)}</td>
                    <td className="table-cell text-sm">{formatDate(d.reportedAt)}</td>
                    <td className="table-cell"><StatusBadge status={d.status} type="damage" /></td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button onClick={() => setViewDamage(d)} className="p-1.5 hover:bg-blue-50 rounded-lg text-primary-700 text-xs font-medium">View</button>
                        {d.status === 'reported' && (
                          <>
                            <button onClick={() => handleReview(d, 'approved')} className="p-1.5 hover:bg-green-50 rounded-lg text-success"><CheckCircle size={14} /></button>
                            <button onClick={() => handleReview(d, 'rejected')} className="p-1.5 hover:bg-red-50 rounded-lg text-danger"><XCircle size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={pagination.pages || 1} onPageChange={setPage} totalItems={pagination.total || 0} itemsPerPage={10} />
      </div>

      {/* View Damage Modal */}
      <Modal isOpen={!!viewDamage} onClose={() => setViewDamage(null)} title="Damage Report Details" size="lg">
        {viewDamage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted">Customer</p>
                <p className="font-medium">{viewDamage.customerId?.name}</p>
                <p className="text-xs text-muted">{viewDamage.customerId?.phone}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted">Reported By</p>
                <p className="font-medium">{viewDamage.staffId?.name}</p>
                <p className="text-xs text-muted">{viewDamage.staffId?.vehicleNumber}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600">Damaged Cans</p>
                <p className="text-2xl font-bold text-danger">{viewDamage.damagedCans}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600">Total Charge</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(viewDamage.totalCharge)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Reason</p>
              <span className="badge badge-red">{DAMAGE_REASONS[viewDamage.damageReason]}</span>
            </div>
            {viewDamage.description && (
              <div>
                <p className="text-xs text-muted mb-1">Description</p>
                <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">{viewDamage.description}</p>
              </div>
            )}
            {viewDamage.photos?.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-2">Photos ({viewDamage.photos.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {viewDamage.photos.map((photo, i) => (
                    <img
                      key={i} src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${photo}`}
                      alt={`Damage ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 border border-gray-200"
                      onClick={() => setLightboxImg(`${import.meta.env.VITE_API_URL?.replace('/api', '')}${photo}`)}
                    />
                  ))}
                </div>
              </div>
            )}
            {viewDamage.status === 'reported' && (
              <div className="flex gap-3 pt-2 border-t">
                <button onClick={() => handleReview(viewDamage, 'approved')} className="btn-success flex-1">
                  <CheckCircle size={16} /> Approve
                </button>
                <button onClick={() => handleReview(viewDamage, 'rejected')} className="btn-danger flex-1">
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Damage" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default DamagesPage;
