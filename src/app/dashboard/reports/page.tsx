'use client';
import { useState, useRef, useMemo } from 'react';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Calendar, DollarSign, ShoppingBag, TrendingUp, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSWRFetch } from '@/lib/useSWRFetch';

type ReportData = {
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    averageTicketSize: number;
  };
  dailySales: { date: string; revenue: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
};

// Build API URL based on preset — use a stable key so SWR cache works
function getReportUrl(preset: 'today' | '7days' | '30days'): string {
  return `/api/reports?preset=${preset}`;
}

export default function ReportsPage() {
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [rangePreset, setRangePreset] = useState<'today' | '7days' | '30days'>('today');

  // SWR: fetch reports keyed by preset — switching presets shows cached data instantly
  const reportUrl = useMemo(() => getReportUrl(rangePreset), [rangePreset]);
  const { data, isLoading: loading, mutate } = useSWRFetch<ReportData>(reportUrl);
  const [refreshing, setRefreshing] = useState(false);

  const handlePresetChange = (preset: 'today' | '7days' | '30days') => {
    setRangePreset(preset);
  };

  // Find max daily sales for bar chart height scaling
  const maxRevenue = data?.dailySales.reduce((max, d) => Math.max(max, d.revenue), 0) || 1;

  if (loading) {
    return <DashboardSkeleton type="table" />;
  }

  const metrics = data?.metrics || { totalOrders: 0, totalRevenue: 0, averageTicketSize: 0 };
  const dailySales = data?.dailySales || [];
  const topItems = data?.topItems || [];

  return (
    <>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="page-header-pretitle">Business Insights</span>
          <h1>Reports & Analytics</h1>
          <p>Analyze sales, order volumes, and menu popularity.</p>
        </div>
        
        {/* Range Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.03)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <button 
            className={`btn btn-sm ${rangePreset === 'today' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
            onClick={() => handlePresetChange('today')}
          >
            Today
          </button>
          <button 
            className={`btn btn-sm ${rangePreset === '7days' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
            onClick={() => handlePresetChange('7days')}
          >
            Last 7 Days
          </button>
          <button 
            className={`btn btn-sm ${rangePreset === '30days' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
            onClick={() => handlePresetChange('30days')}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {refreshing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          <RefreshCw size={14} className="spin-icon" /> Updating data...
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Gross Revenue Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            width: 48, height: 48, 
            borderRadius: 'var(--radius-md)', 
            background: 'rgba(16, 185, 129, 0.08)', 
            color: 'var(--status-ready)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross Revenue</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
              ₹{metrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        {/* Orders Served Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            width: 48, height: 48, 
            borderRadius: 'var(--radius-md)', 
            background: 'rgba(3, 77, 55, 0.08)', 
            color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orders Served</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
              {metrics.totalOrders}
            </h2>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            width: 48, height: 48, 
            borderRadius: 'var(--radius-md)', 
            background: 'rgba(99, 102, 241, 0.08)', 
            color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Order Value</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
              ₹{metrics.averageTicketSize.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '1.5rem' }}>
        {/* Sales Trend Chart (CSS-based) */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Sales Performance</h3>
          
          {dailySales.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '220px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No sales data for this period
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, width: '100%' }}>
              {/* Left Scroll Arrow */}
              {dailySales.length > 7 && (
                <button
                  onClick={() => {
                    chartScrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' });
                  }}
                  className="btn btn-ghost btn-icon"
                  style={{
                    position: 'absolute',
                    left: '0px',
                    top: '75px',
                    zIndex: 20,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bg-surface)',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {/* Right Scroll Arrow */}
              {dailySales.length > 7 && (
                <button
                  onClick={() => {
                    chartScrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' });
                  }}
                  className="btn btn-ghost btn-icon"
                  style={{
                    position: 'absolute',
                    right: '0px',
                    top: '75px',
                    zIndex: 20,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bg-surface)',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                  aria-label="Scroll right"
                >
                  <ChevronRight size={16} />
                </button>
              )}

              <div 
                ref={chartScrollRef}
                className="custom-scrollbar" 
                style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowX: 'auto', paddingBottom: '0.75rem', width: '100%', maxWidth: '100%' }}
              >
                <div style={{ minWidth: dailySales.length > 7 ? `${dailySales.length * 48}px` : '100%', display: 'flex', flexDirection: 'column', paddingRight: '1.5rem' }}>
                {/* Chart container */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-end', 
                  justifyContent: 'space-around', 
                  height: '200px', 
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '0.5rem',
                  gap: '0.5rem'
                }}>
                  {dailySales.map((day, idx) => {
                    const pct = Math.max(4, (day.revenue / maxRevenue) * 100);
                    const isHoveredMsg = `₹${day.revenue.toFixed(2)}`;

                    return (
                      <div 
                        key={idx} 
                        className="chart-bar-group"
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          flex: 1, 
                          height: '100%',
                          justifyContent: 'flex-end',
                          position: 'relative'
                        }}
                      >
                        {/* Hover Tooltip */}
                        <div className="chart-tooltip" style={{
                          position: 'absolute',
                          bottom: `calc(${pct}% + 8px)`,
                          background: 'var(--text-primary)',
                          color: 'var(--bg-surface)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: 'var(--shadow-sm)',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}>
                          {isHoveredMsg}
                        </div>

                        {/* Bar */}
                        <div 
                          style={{ 
                            width: '100%', 
                            maxWidth: '28px',
                            height: `${pct}%`, 
                            background: 'linear-gradient(180deg, var(--status-ready) 0%, var(--accent) 100%)',
                            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                            transition: 'height 0.4s ease, opacity 0.2s',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X Axis Labels */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-around', 
                  marginTop: '0.5rem',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600
                }}>
                  {dailySales.map((day, idx) => {
                    const parts = day.date.split('-');
                    const label = `${parts[2]}/${parts[1]}`; // DD/MM format
                    return (
                      <span key={idx} style={{ flex: 1, textAlign: 'center' }}>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Top Selling Menu Items */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', fontWeight: 700 }}>Top Selling Items</h3>
          
          {topItems.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '220px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No orders served in this period
            </div>
          ) : (
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', height: '35px', textAlign: 'left' }}>
                    <th style={{ fontWeight: 600, paddingBottom: '0.5rem' }}>Item Name</th>
                    <th style={{ fontWeight: 600, paddingBottom: '0.5rem', textAlign: 'center', width: '80px' }}>Quantity</th>
                    <th style={{ fontWeight: 600, paddingBottom: '0.5rem', textAlign: 'right', width: '100px' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)', height: '40px' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                        ₹{item.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
       {/* Tooltip Hover & Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .chart-bar-group .chart-tooltip {
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.2s, transform 0.2s;
        }
        .chart-bar-group:hover .chart-tooltip {
          opacity: 1;
          transform: translateY(0);
        }
        .chart-bar-group:hover div[style*="background"] {
          filter: brightness(1.05);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
        }
        
        /* High visibility custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px !important;
          display: block !important;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(3, 77, 55, 0.05) !important;
          border-radius: 99px !important;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--accent) !important;
          border-radius: 99px !important;
        }
      ` }} />
    </>
  );
}
