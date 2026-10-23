import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, DAMAGE_REASONS } from '../../utils/helpers';

const COLORS = ['#0F4C81', '#0284C7', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('deliveries');
  const [loading, setLoading] = useState(true);
  const [deliveryData, setDeliveryData] = useState(null);
  const [damageData, setDamageData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchAll();
  }, [period]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dRes, dmRes, cRes] = await Promise.all([
        analyticsAPI.deliveries({ period }),
        analyticsAPI.damages(),
        analyticsAPI.customers(),
      ]);
      setDeliveryData(dRes.data);
      setDamageData(dmRes.data);
      setCustomerData(cRes.data);
    } catch {} finally { setLoading(false); }
  };

  const tabs = [
    { id: 'deliveries', label: 'Delivery Performance' },
    { id: 'customers', label: 'Customer Insights' },
    { id: 'damages', label: 'Damage Analysis' },
  ];

  const statusBreakdown = deliveryData?.statusBreakdown || {};
  const pieData = Object.entries(statusBreakdown).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v })).filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Business intelligence and performance metrics" />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-primary-700 text-primary-700' : 'border-transparent text-muted hover:text-dark'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'deliveries' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input-field w-auto">
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="year">Last 365 days</option>
            </select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="section-title mb-4">Daily Deliveries</h3>
              {loading ? <div className="skeleton h-48 rounded"></div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deliveryData?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                    <Legend />
                    <Bar dataKey="delivered" name="Delivered" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 className="section-title mb-4">Status Breakdown</h3>
              {loading ? <div className="skeleton h-48 rounded"></div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={true} fontSize={10}>
                      {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="card">
          <h3 className="section-title mb-4">Top Customers by Deliveries</h3>
          {loading ? <div className="skeleton h-48 rounded"></div> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerData?.topCustomers || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Bar dataKey="totalDeliveries" name="Deliveries" fill="#0F4C81" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {activeTab === 'damages' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title mb-4">Damage by Reason</h3>
            {loading ? <div className="skeleton h-48 rounded"></div> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={damageData?.byReason?.map(r => ({ ...r, name: DAMAGE_REASONS[r._id] || r._id })) || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                  <Bar dataKey="count" name="Reports" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="card">
            <h3 className="section-title mb-4">Most Affected Customers</h3>
            <div className="space-y-3">
              {(damageData?.topAffected || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted">{c.totalDamages} damaged cans</p>
                  </div>
                  <span className="font-semibold text-danger">{formatCurrency(c.totalCharge)}</span>
                </div>
              ))}
              {(!damageData?.topAffected?.length) && <p className="text-sm text-muted text-center py-4">No damage data</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
