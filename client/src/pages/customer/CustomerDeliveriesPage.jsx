import React, { useState, useEffect } from 'react';
import { deliveryAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { Package, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../context/AuthContext';

const CustomerDeliveriesPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setLoading(true);
        const res = await deliveryAPI.getAll({ page, limit: 10 });
        setDeliveries(res.data || []);
        setPagination(res.pagination || {});
      } catch {} finally { setLoading(false); }
    };
    fetchDeliveries();
  }, [page]);

  const downloadReceipt = (delivery) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 76, 129);
    doc.text('💧 AQUATRACK', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Smart Water Delivery. Real-Time Tracking.', margin, y);
    y += 12;

    // Line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, 190, y);
    y += 10;

    // Receipt info
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Delivery Receipt`, margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Receipt No: ${delivery.deliveryId}`, margin, y);
    doc.text(`Date: ${formatDate(delivery.deliveredAt || delivery.scheduledDate)}`, 130, y);
    y += 12;

    doc.line(margin, y, 190, y);
    y += 10;

    // Customer
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Customer Information', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Name: ${delivery.customerId?.name || user?.name}`, margin, y); y += 6;
    doc.text(`Phone: ${delivery.customerId?.phone || user?.phone}`, margin, y); y += 6;
    doc.text(`Address: ${delivery.deliveryAddress}`, margin, y); y += 12;

    // Delivery Details
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Delivery Details', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Staff: ${delivery.staffId?.name || 'N/A'}`, margin, y); y += 6;
    doc.text(`Cans Delivered: ${delivery.cansDelivered || delivery.cansOrdered}`, margin, y); y += 6;
    doc.text(`Cans Returned: ${delivery.cansReturned || 0}`, margin, y); y += 6;
    doc.text(`Status: ${delivery.status.toUpperCase()}`, margin, y); y += 12;

    // Amount
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Payment Summary', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Delivery Amount: ₹${delivery.amount || 0}`, margin, y); y += 6;
    doc.text(`Damage Charges: ₹${delivery.damageCharges || 0}`, margin, y); y += 6;
    doc.setFontSize(12);
    doc.setTextColor(15, 76, 129);
    doc.text(`Total: ₹${delivery.totalAmount || delivery.amount || 0}`, margin, y); y += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Payment Status: ${delivery.paymentStatus?.toUpperCase() || 'PENDING'}`, margin, y);
    y += 15;

    doc.line(margin, y, 190, y);
    y += 8;
    doc.setFontSize(9);
    doc.text('Thank you for choosing AquaTrack! For support: support@aquatrack.com', margin, y);

    doc.save(`AquaTrack_Receipt_${delivery.deliveryId}.pdf`);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="My Deliveries" subtitle={`${pagination.total || 0} total deliveries`} />
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Delivery ID</th>
                <th className="table-header">Date</th>
                <th className="table-header">Staff</th>
                <th className="table-header">Cans</th>
                <th className="table-header">Returned</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="table-cell"><div className="skeleton h-4 rounded"></div></td>)}</tr>)
              ) : deliveries.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No deliveries yet" icon={Package} /></td></tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50/50">
                    <td className="table-cell font-mono text-xs text-primary-700">{d.deliveryId}</td>
                    <td className="table-cell text-sm">{formatDate(d.scheduledDate)}</td>
                    <td className="table-cell text-sm text-muted">{d.staffId?.name || 'N/A'}</td>
                    <td className="table-cell font-semibold">{d.cansDelivered || d.cansOrdered}</td>
                    <td className="table-cell text-success font-medium">{d.cansReturned || 0}</td>
                    <td className="table-cell font-medium">{formatCurrency(d.amount)}</td>
                    <td className="table-cell"><StatusBadge status={d.status} /></td>
                    <td className="table-cell">
                      {d.status === 'delivered' && (
                        <button onClick={() => downloadReceipt(d)} className="flex items-center gap-1 text-xs text-primary-700 hover:underline">
                          <Download size={13} /> PDF
                        </button>
                      )}
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

export default CustomerDeliveriesPage;
