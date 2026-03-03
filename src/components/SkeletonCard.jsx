import React from 'react';

export default function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-header">
                <div className="skeleton-circle" />
                <div style={{ flex: 1 }}>
                    <div className="skeleton-line" style={{ width: '60%', marginBottom: '8px' }} />
                    <div className="skeleton-line" style={{ width: '35%', height: '12px' }} />
                </div>
                <div className="skeleton-badge" />
            </div>
            <div className="skeleton-route">
                <div className="skeleton-line" style={{ width: '80%', marginBottom: '8px' }} />
                <div className="skeleton-rect" style={{ width: '2px', height: '14px', margin: '4px 0 4px 6px' }} />
                <div className="skeleton-line" style={{ width: '70%' }} />
            </div>
            <div className="skeleton-btn" />

            <style>{`
        .skeleton-card {
          background: white;
          border-radius: 16px;
          padding: 1rem;
          border: 1px solid #f3f4f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .skeleton-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1rem;
        }
        .skeleton-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          flex-shrink: 0;
        }
        .skeleton-line {
          height: 16px;
          border-radius: 8px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-rect {
          border-radius: 2px;
          background: #e5e7eb;
        }
        .skeleton-badge {
          width: 52px;
          height: 28px;
          border-radius: 14px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          flex-shrink: 0;
        }
        .skeleton-route {
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 1rem;
        }
        .skeleton-btn {
          height: 42px;
          border-radius: 8px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
        </div>
    );
}
