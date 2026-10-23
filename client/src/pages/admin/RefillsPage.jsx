import React, { useState, useEffect, useCallback } from 'react';
import { refillAPI, customerAPI, staffAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import {
  Plus,
  RefreshCw,
  Calendar,
  UserCheck,
  Truck,
  Droplets,
  Clock,
  Phone,
  MapPin,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';

const RefillsPage = () => {
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRefill, setSelectedRefill] = useState(null);

  // Form states
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [createForm, setCreateForm] = useState({
    customerId: '',
    requestedDate: tomorrowStr,
    requestedTime: '10:00 AM',
    quantity: 10,
    canSize: 20,
    notes: '',
  });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchRefills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await refillAPI.getAll({
        status: statusFilter,
        search,
        page,
        limit: 10,
      });
      setRefills(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error('Error fetching refills:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchRefills();
  }, [fetchRefills]);

  useEffect(() => {
    Promise.all([
      customerAPI.getAll({ limit: 100 }),
      staffAPI.getAll({ limit: 50 }),
    ]).then(([cRes, sRes]) => {
      setCustomers(cRes.data || []);
      setStaffList(sRes.data || []);
    });
  }, []);

  const openAssignModal = (refill) => {
    setSelectedRefill(refill);
    setSelectedStaffId(refill.assignedStaffId?._id || '');
    setShowAssignModal(true);
  };

  const handleAssignStaff = async () => {
    if (!selectedStaffId) {
      return toast.error('Please select a delivery staff member');
    }

    try {
      setAssignLoading(true);
      await refillAPI.assignStaff(selectedRefill._id, selectedStaffId);
      const assignedStaff = staffList.find((s) => s._id === selectedStaffId);
      toast.success(`Assigned to ${assignedStaff?.name || 'Staff'}`);
      setShowAssignModal(false);
      fetchRefills();
    } catch (err) {
      toast.error(err.message || 'Failed to assign staff');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      await refillAPI.create(createForm);
      toast.success('Refill request created');
      setShowCreateModal(false);
      setCreateForm({
        customerId: '',
        requestedDate: tomorrowStr,
        requestedTime: '10:00 AM',
        quantity: 10,
        canSize: 20,
        notes: '',
      });
      fetchRefills();
    } catch (err) {
      toast.error(err.message || 'Failed to create refill');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await refillAPI.update(id, { status });
      toast.success(`Status updated to ${status}`);
      fetchRefills();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statusFilters = [
    { label: 'All Requests', value: '' },
    { label: 'Pending', value: 'pending', countColor: 'text-amber-600' },
    { label: 'Assigned', value: 'assigned', countColor: 'text-blue-600' },
    { label: 'Out for Delivery', value: 'out_for_delivery', countColor: 'text-orange-600' },
    { label: 'Delivered', value: 'delivered', countColor: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refill Requests"
        subtitle={`${pagination.total || 0} customer refill requests`}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={16} /> New Refill Request
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === tab.value
                  ? 'bg-[#0284C7] text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refills Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Refill ID</th>
                <th className="table-header">Customer Name & Phone</th>
                <th className="table-header">Requested Date & Time</th>
                <th className="table-header">Quantity & Size</th>
                <th className="table-header">Status</th>
                <th className="table-header">Assigned Staff</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : refills.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No refill requests found"
                      description="Customer refill requests will appear here as they are submitted."
                      icon={RefreshCw}
                    />
                  </td>
                </tr>
              ) : (
                refills.map((r) => {
                  const cust = r.customerId;
                  const staff = r.assignedStaffId;
                  const qty = r.quantity || r.cansCount;
                  const size = r.canSize || 20;

                  return (
                    <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell font-mono text-xs font-semibold text-primary-700">
                        {r.refillId}
                      </td>
                      <td className="table-cell">
                        <p className="font-semibold text-sm text-gray-900">{cust?.name || 'N/A'}</p>
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <Phone size={11} /> {cust?.phone || 'No phone'}
                        </p>
                      </td>
                      <td className="table-cell text-sm">
                        <p className="font-medium text-gray-900">
                          {formatDate(r.requestedDate || r.scheduledDate)}
                        </p>
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <Clock size={11} /> {r.requestedTime || '10:00 AM'}
                        </p>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <Droplets size={14} className="text-[#0284C7]" />
                          <span className="font-bold text-gray-900">{qty} cans</span>
                          <span className="text-xs text-muted">× {size}L</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={r.status} type="refill" />
                      </td>
                      <td className="table-cell">
                        {staff ? (
                          <div>
                            <p className="font-semibold text-xs text-gray-900">{staff.name}</p>
                            <p className="text-[11px] text-muted flex items-center gap-1">
                              <Truck size={10} /> {staff.vehicleNumber || 'Assigned'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openAssignModal(r)}
                            className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                            title={staff ? 'Reassign Staff' : 'Assign Staff'}
                          >
                            <UserCheck size={13} />
                            <span>{staff ? 'Reassign' : 'Assign Staff'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRefill(r);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={pagination.pages || 1}
          onPageChange={setPage}
          totalItems={pagination.total || 0}
          itemsPerPage={10}
        />
      </div>

      {/* Assign Staff Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Delivery Staff"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowAssignModal(false)}>
              Cancel
            </button>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleAssignStaff}
              disabled={assignLoading || !selectedStaffId}
            >
              {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </>
        }
      >
        {selectedRefill && (
          <div className="space-y-4">
            {/* Request Summary Box */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-blue-100 font-medium">
                <span className="text-muted">Refill ID:</span>
                <span className="font-mono text-primary-700 font-bold">{selectedRefill.refillId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Customer:</span>
                <span className="font-semibold text-gray-800">{selectedRefill.customerId?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Address:</span>
                <span className="text-gray-800 text-right max-w-[240px] truncate">
                  {selectedRefill.customerId?.address}, {selectedRefill.customerId?.city}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Required:</span>
                <span className="font-bold text-[#0284C7]">
                  {selectedRefill.quantity || selectedRefill.cansCount} cans × {selectedRefill.canSize || 20}L
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Requested Time:</span>
                <span className="font-medium text-gray-800">
                  {formatDate(selectedRefill.requestedDate || selectedRefill.scheduledDate)} at{' '}
                  {selectedRefill.requestedTime || '10:00 AM'}
                </span>
              </div>
            </div>

            {/* Staff Selector */}
            <div>
              <label className="label">Select Delivery Staff Member *</label>
              <select
                className="input-field font-medium"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">-- Choose an available staff member --</option>
                {staffList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} — Vehicle: {s.vehicleNumber || 'No vehicle'} ({s.vehicleType || 'Truck'})
                  </option>
                ))}
              </select>
            </div>

            {selectedStaffId && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                {(() => {
                  const s = staffList.find((st) => st._id === selectedStaffId);
                  if (!s) return null;
                  return (
                    <div className="space-y-1">
                      <p className="font-bold text-gray-800">{s.name}</p>
                      <p className="text-muted">Phone: {s.phone}</p>
                      <p className="text-muted">Vehicle: {s.vehicleNumber} ({s.vehicleType})</p>
                      <p className="text-muted">Current Status: {s.isOnDuty ? '🟢 On Duty' : '⚪ Off Duty'}</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Refill Request Modal (Admin on behalf of customer) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Refill Request"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleCreate}
              disabled={createLoading}
            >
              {createLoading ? 'Creating...' : 'Create Request'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Customer *</label>
            <select
              className="input-field"
              value={createForm.customerId}
              onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
              required
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.phone} ({c.city})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Requested Date *</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="input-field"
                value={createForm.requestedDate}
                onChange={(e) => setCreateForm({ ...createForm, requestedDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Preferred Time *</label>
              <select
                className="input-field"
                value={createForm.requestedTime}
                onChange={(e) => setCreateForm({ ...createForm, requestedTime: e.target.value })}
                required
              >
                {['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Number of Cans *</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={createForm.quantity}
                onChange={(e) =>
                  setCreateForm({ ...createForm, quantity: parseInt(e.target.value, 10) || 1 })
                }
                required
              />
            </div>
            <div>
              <label className="label">Can Size *</label>
              <select
                className="input-field"
                value={createForm.canSize}
                onChange={(e) =>
                  setCreateForm({ ...createForm, canSize: parseInt(e.target.value, 10) || 20 })
                }
                required
              >
                <option value={20}>20 Litres</option>
                <option value={10}>10 Litres</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes / Instructions</label>
            <textarea
              className="input-field"
              rows={2}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="e.g. Special delivery timing or gate code"
            />
          </div>
        </form>
      </Modal>

      {/* Refill Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Refill Request Details"
        size="md"
        footer={
          <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </button>
        }
      >
        {selectedRefill && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="font-mono text-primary-700 font-bold text-base">
                  {selectedRefill.refillId}
                </span>
                <p className="text-xs text-muted">Created: {formatDate(selectedRefill.createdAt)}</p>
              </div>
              <StatusBadge status={selectedRefill.status} type="refill" />
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-muted tracking-wider">Customer Details</h4>
              <p className="font-semibold text-gray-900">{selectedRefill.customerId?.name}</p>
              <p className="text-xs text-muted">Phone: {selectedRefill.customerId?.phone}</p>
              <p className="text-xs text-muted">Address: {selectedRefill.customerId?.address}, {selectedRefill.customerId?.city}</p>
            </div>

            <div className="space-y-2 border-t pt-3">
              <h4 className="font-bold text-xs uppercase text-muted tracking-wider">Refill Requirement</h4>
              <p className="text-gray-900">
                Quantity: <span className="font-bold text-primary-700">{selectedRefill.quantity || selectedRefill.cansCount} cans</span> ({selectedRefill.canSize || 20}L each)
              </p>
              <p className="text-xs text-muted">
                Delivery Slot: {formatDate(selectedRefill.requestedDate || selectedRefill.scheduledDate)} at {selectedRefill.requestedTime || '10:00 AM'}
              </p>
              {selectedRefill.notes && (
                <p className="text-xs italic text-gray-600 bg-gray-50 p-2 rounded">
                  Notes: "{selectedRefill.notes}"
                </p>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <h4 className="font-bold text-xs uppercase text-muted tracking-wider">Assigned Delivery Staff</h4>
              {selectedRefill.assignedStaffId ? (
                <div>
                  <p className="font-semibold text-gray-900">{selectedRefill.assignedStaffId.name}</p>
                  <p className="text-xs text-muted">Phone: {selectedRefill.assignedStaffId.phone}</p>
                  <p className="text-xs text-muted">Vehicle: {selectedRefill.assignedStaffId.vehicleNumber}</p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-amber-700 text-xs">No delivery staff assigned yet</span>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openAssignModal(selectedRefill);
                    }}
                    className="btn-primary text-xs py-1 px-2.5"
                  >
                    Assign Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RefillsPage;
