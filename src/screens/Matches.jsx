import React, { useEffect } from 'react';
import { Star, CheckCircle, Clock, Car } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SkeletonCard from '../components/SkeletonCard';
import { api } from '../utils/api';

export default function Matches({ matches = [], setMatches, onConnect, isLoading = false, searchCriteria, currentUser }) {
  const { t } = useTranslation();

  // Auto-polling while on Matches screen if no matches are found or periodically
  useEffect(() => {
    // Only poll if we are NOT in the initial loading state (скелетоны крутятся)
    // and we have the search criteria
    if (isLoading || !searchCriteria || !currentUser) return;

    const pollInterval = setInterval(async () => {
      try {
        const found = await api.findMatches(
          currentUser.id,
          searchCriteria.role,
          searchCriteria.from,
          searchCriteria.to,
          searchCriteria.time
        );

        if (found.length > 0) {
          const mappedMatches = found.map(m => ({
            id: m.id,
            role: m.role,
            from: m.origin,
            to: m.destination,
            origin: m.origin,
            destination: m.destination,
            time: m.time,
            userId: m.user_id,
            user_id: m.user_id,
            user: {
              id: m.user?.id,
              name: m.user?.name || 'Пользователь',
              photo: m.user?.photo || `https://i.pravatar.cc/150?u=${m.user_id}`,
              trust_rating: m.user?.trust_rating || 5.0,
              is_verified: m.user?.is_verified || false,
              car_model: m.user?.car_model || null
            }
          }));

          setMatches(mappedMatches);
        }
      } catch (e) {
        console.error("Auto-poll error:", e);
      }
    }, 10000); // 10 seconds interval

    return () => clearInterval(pollInterval);
  }, [isLoading, searchCriteria, currentUser, setMatches]);
  if (isLoading) {
    return (
      <div className="matches screen-content">
        <h2 style={{ marginBottom: '1rem', color: 'var(--dark)' }}>{t('matches.searching')}</h2>
        <div className="matches-list">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="matches screen-content glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <Clock size={48} color="#9ca3af" style={{ margin: '0 auto 1rem auto' }} />
        <h3>{t('matches.empty')}</h3>
      </div>
    );
  }

  return (
    <div className="matches screen-content">
      <h2 style={{ marginBottom: '1rem', color: 'var(--dark)' }}>{t('matches.title')}</h2>

      <div className="matches-list">
        {matches.map(trip => (
          <div key={trip.id} className="match-card glass-panel" onClick={() => onConnect(trip)}>
            <div className="match-header">
              <img src={trip.user.photo} alt={trip.user.name} className="user-avatar" />
              <div className="user-info">
                <div className="user-name">
                  {trip.user.name}
                  {trip.user.is_verified && <CheckCircle size={14} color="var(--primary)" />}
                </div>
                <div className="user-rating">
                  <Star size={14} color="#f59e0b" fill="#f59e0b" />
                  <span>{(trip.user.trust_rating || 5.0).toFixed(1)}</span>
                </div>
                {trip.role === 'driver' && trip.user.car_model && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Car size={12} /> {trip.user.car_model}
                  </div>
                )}
              </div>
              <div className="match-time glass-badge">
                {trip.time}
              </div>
            </div>

            <div className="match-route">
              <div className="route-point">{trip.from}</div>
              <div className="route-divider"></div>
              <div className="route-point">{trip.to}</div>
            </div>

            <button className="primary-btn match-btn">
              {t('matches.open')}
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .matches-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .match-card {
          padding: 1rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .match-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }
        .match-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1rem;
        }
        .user-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .user-info {
          flex: 1;
        }
        .user-name {
          font-weight: 700;
          color: var(--dark);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .user-rating {
          font-size: 0.85rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        .glass-badge {
          background: rgba(76, 175, 80, 0.1);
          color: var(--primary);
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .match-route {
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 1rem;
        }
        .route-point {
          font-size: 0.85rem;
          color: #4b5563;
        }
        .route-divider {
          height: 12px;
          width: 2px;
          background: #e5e7eb;
          margin: 4px 0 4px 6px;
        }
        .match-btn {
          margin-top: 0;
          padding: 10px;
          background: white;
          color: var(--primary);
          border: 1px solid var(--primary);
        }
        .match-btn:hover {
          background: var(--primary);
          color: white;
        }
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 1.5rem auto 0;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
