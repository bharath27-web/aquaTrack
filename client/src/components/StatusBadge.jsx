import React from 'react';
import { DELIVERY_STATUS } from '../utils/helpers';

const StatusBadge = ({ status, type = 'delivery' }) => {
  const statusMap = {
    delivery: DELIVERY_STATUS,
    customer: {
      active: { label: 'Active', color: 'badge-green' },
      inactive: { label: 'Inactive', color: 'badge-gray' },
      suspended: { label: 'Suspended', color: 'badge-red' },
    },
    staff: {
      active: { label: 'Active', color: 'badge-green' },
      inactive: { label: 'Inactive', color: 'badge-gray' },
      on_leave: { label: 'On Leave', color: 'badge-yellow' },
    },
    damage: {
      reported: { label: 'Reported', color: 'badge-yellow' },
      reviewed: { label: 'Reviewed', color: 'badge-blue' },
      approved: { label: 'Approved', color: 'badge-green' },
      rejected: { label: 'Rejected', color: 'badge-red' },
    },
    refill: {
      pending: { label: 'Pending', color: 'badge-yellow' },
      approved: { label: 'Approved', color: 'badge-blue' },
      assigned: { label: 'Assigned', color: 'badge-purple' },
      out_for_delivery: { label: 'Out for Delivery', color: 'badge-orange' },
      delivered: { label: 'Delivered', color: 'badge-green' },
      cancelled: { label: 'Cancelled', color: 'badge-red' },
      scheduled: { label: 'Scheduled', color: 'badge-blue' },
      due: { label: 'Due', color: 'badge-red' },
      completed: { label: 'Completed', color: 'badge-green' },
      rescheduled: { label: 'Rescheduled', color: 'badge-yellow' },
      skipped: { label: 'Skipped', color: 'badge-gray' },
    },
    payment: {
      pending: { label: 'Pending', color: 'badge-yellow' },
      completed: { label: 'Paid', color: 'badge-green' },
      failed: { label: 'Failed', color: 'badge-red' },
      refunded: { label: 'Refunded', color: 'badge-purple' },
      partial: { label: 'Partial', color: 'badge-orange' },
    },
    return: {
      complete: { label: 'Complete', color: 'badge-green' },
      partial: { label: 'Partial', color: 'badge-yellow' },
    },
  };

  const config = statusMap[type]?.[status] || { label: status, color: 'badge-gray' };
  return (
    <span className={config.color}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
