import React, { useEffect, useState, useRef } from 'react';
import { Star, CheckCircle, Clock, Car, Send, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SkeletonCard from '../components/SkeletonCard';
import { api } from '../utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com';

// Вспомогательные функции API для запросов
const requestApi = {
  sendRequest: async (tripId, requesterTripId, requesterId, driverId) => {
    const res = await fetch(`${API_URL}/trip-requests/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('birge_token')}` },
      body: JSON.stringify({ trip_id: tripId, requester_trip_id: requesterTripId, requester_id: requesterId, driver_id: driverId }),
    });
    return res.json();
  },
  checkStatus: async (requesterId, tripId) => {
    const res = await fetch(`${API_URL}/trip-requests/status/${requesterId}/${tripId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('birge_token')}` },
    });
    return res.json();
  }
};

export default function Matches({ matches = [], setMatches, onConnect, isLoading = false, searchCriteria, currentUser, myTripId }) {
  const { t } = useTranslation();
  const [requestStatus, setRequestStatus] = useState({}); // { [tripId]: 'pending'|'accepted'|'declined' }
  const connectedRef = useRef(false); // защита от повторного вызова onConnect

  // Автополлинг за совпадениями
  useEffect(() => {
    if (isLoading || !searchCriteria || !currentUser) return;
    const pollInterval = setInterval(async () => {
      try {
        const found = await api.findMatches(currentUser.id, searchCriteria.role, searchCriteria.from, searchCriteria.to, searchCriteria.time);
        if (found.length > 0) {
          const mapped = found.map(m => ({
            id: m.id, role: m.role,
            from: m.origin, to: m.destination,
            origin: m.origin, destination: m.destination,
            time: m.time, userId: m.user_id, user_id: m.user_id,
            user: {
              id: m.user?.id, name: m.user?.name || 'Пользователь',
              photo: m.user?.photo || `https://i.pravatar.cc/150?u=${m.user_id}`,
              trust_rating: m.user?.trust_rating || 5.0,
              is_verified: m.user?.is_verified || false,
              car_model: m.user?.car_model || null
            }
          }));
          setMatches(mapped);
        }
      } catch (e) { console.error('Auto-poll error:', e); }
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [isLoading, searchCriteria, currentUser, setMatches]);

  // Для пассажира: polling статуса запросов
  useEffect(() => {
    if (!currentUser || searchCriteria?.role !== 'passenger' || matches.length === 0) return;
    connectedRef.current = false; // сброс при смене поисковых данных
    const pollReqStatus = setInterval(async () => {
      for (const trip of matches) {
        try {
          const st = await requestApi.checkStatus(currentUser.id, trip.id);
          if (st.status && st.status !== 'not_sent') {
            setRequestStatus(prev => ({ ...prev, [trip.id]: st.status }));
            // Если принят — переходим в чат ТОЛЬКО ОДИН РАЗ
            if (st.status === 'accepted' && !connectedRef.current) {
              connectedRef.current = true;
              clearInterval(pollReqStatus);
              // Используем trip_id из ответа, чтобы гарантировать совпадение с водителем
              const chatTripId = st.trip_id || trip.id;
              onConnect({ ...trip, id: chatTripId, requestInfo: st });
            }
          }
        } catch (e) { }
      }
    }, 5000);
    return () => clearInterval(pollReqStatus);
  }, [currentUser, matches, searchCriteria]);

  const handleSendRequest = async (trip) => {
    if (!currentUser || !myTripId) return;
    setRequestStatus(prev => ({ ...prev, [trip.id]: 'sending' }));
    try {
      await requestApi.sendRequest(trip.id, myTripId, currentUser.id, trip.user_id);
      setRequestStatus(prev => ({ ...prev, [trip.id]: 'pending' }));
    } catch (e) {
      setRequestStatus(prev => ({ ...prev, [trip.id]: null }));
    }
  };

  const isDriver = searchCriteria?.role === 'driver';

  if (isLoading) {
    return (
      <div className="matches screen-content">
        <h2 style={{ marginBottom: '1rem', color: 'var(--dark)' }}>{t('matches.searching')}</h2>
        <div className="matches-list"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="matches screen-content glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <Clock size={48} color="#9ca3af" style={{ margin: '0 auto 1rem auto' }} />
        <h3>{t('matches.empty')}</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Ищем попутчиков, подождите...</p>
      </div>
    );
  }

  return (
    <div className="matches screen-content">
      <h2 style={{ marginBottom: '1rem', color: 'var(--dark)' }}>
        {isDriver ? 'Запросы пассажиров' : 'Найденные водители'}
      </h2>

      <div className="matches-list">
        {matches.map(trip => {
          const status = requestStatus[trip.id];
          return (
            <div key={trip.id} className="match-card glass-panel">
              {/* Заголовок */}
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
                <div className="match-time glass-badge">{trip.time}</div>
              </div>

              {/* Маршрут */}
              <div className="match-route">
                <div className="route-point">📍 {trip.from}</div>
                <div className="route-divider"></div>
                <div className="route-point">🏁 {trip.to}</div>
              </div>

              {/* Кнопка — разная в зависимости от роли */}
              {isDriver ? (
                // Водитель просто видит совпавшего пассажира (его запросы придут через TripRequestModal)
                <button className="primary-btn match-btn" onClick={() => onConnect(trip)}>
                  {t('matches.open')}
                </button>
              ) : (
                // Пассажир отправляет запрос водителю
                <button
                  className="primary-btn match-btn"
                  onClick={() => status ? null : handleSendRequest(trip)}
                  disabled={!!status}
                  style={{
                    background: status === 'accepted' ? '#10b981'
                      : status === 'declined' ? '#f43f5e'
                        : status === 'pending' ? '#f59e0b'
                          : 'var(--primary)',
                    color: 'white',
                    opacity: status ? 0.9 : 1,
                    cursor: status ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {status === 'sending' && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {status === 'pending' && '⏳ Ожидание ответа...'}
                  {status === 'accepted' && '✅ Принят! Открываем чат...'}
                  {status === 'declined' && '❌ Отклонён'}
                  {!status && <><Send size={16} /> Запросить поездку</>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .matches-list { display: flex; flex-direction: column; gap: 1rem; }
        .match-card { padding: 1rem; transition: transform 0.2s, box-shadow 0.2s; }
        .match-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .match-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
        .user-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .user-info { flex: 1; }
        .user-name { font-weight: 700; color: var(--dark); display: flex; align-items: center; gap: 4px; }
        .user-rating { font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
        .glass-badge { background: rgba(76,175,80,0.1); color: var(--primary); padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; }
        .match-route { background: #f9fafb; border-radius: 8px; padding: 12px; margin-bottom: 1rem; }
        .route-point { font-size: 0.85rem; color: #4b5563; }
        .route-divider { height: 12px; width: 2px; background: #e5e7eb; margin: 4px 0 4px 6px; }
        .match-btn { margin-top: 0; padding: 10px; width: 100%; border-radius: 10px; font-weight: 600; font-size: 0.9rem; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
