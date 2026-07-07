export function DashboardSkeleton({ type = 'table' }: { type?: 'table' | 'cards' | 'grid' }) {
  return (
    <div style={{ padding: '0', width: '100%' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="skeleton skeleton-text" style={{ width: 120, height: 14, marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: 220, height: 28, marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: 180, height: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="skeleton" style={{ width: 100, height: 38, borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ width: 120, height: 38, borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>

      {type === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton skeleton-text" style={{ width: 60, height: 20 }} />
              </div>
              <div className="skeleton skeleton-text" style={{ width: '70%', height: 16, marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ width: '40%', height: 14 }} />
            </div>
          ))}
        </div>
      )}

      {type === 'table' && (
        <div className="card" style={{ padding: '1.5rem', minHeight: '50vh' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div className="skeleton" style={{ width: 200, height: 36, borderRadius: 'var(--radius-sm)' }} />
            <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 'var(--radius-sm)' }} />
            <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 'var(--radius-sm)' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 'var(--radius-sm)', opacity: 0.7 }} />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="skeleton skeleton-text" style={{ flex: 2, height: 20 }} />
                <div className="skeleton skeleton-text" style={{ flex: 1, height: 20 }} />
                <div className="skeleton skeleton-text" style={{ flex: 1, height: 20 }} />
                <div className="skeleton skeleton-text" style={{ flex: 1, height: 20 }} />
                <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 'var(--radius-sm)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[1,2,3].map(col => (
            <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ height: 40, borderRadius: 'var(--radius-sm)' }} />
              {[1,2].map(card => (
                <div key={card} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div className="skeleton" style={{ width: 48, height: 32, borderRadius: 'var(--radius-sm)' }} />
                    <div className="skeleton skeleton-text" style={{ width: 60, height: 16 }} />
                  </div>
                  <div className="skeleton skeleton-text" style={{ width: '80%', height: 14, marginBottom: 8 }} />
                  <div className="skeleton skeleton-text" style={{ width: '60%', height: 14, marginBottom: 12 }} />
                  <div className="skeleton" style={{ width: '100%', height: 32, borderRadius: 'var(--radius-sm)' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
