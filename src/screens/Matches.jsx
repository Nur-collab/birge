import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Star, CheckCircle, Clock, Car, Send, Loader, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SkeletonCard from '../components/SkeletonCard';
import { api } from '../utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com';

// Вспомогательные функции API для запросов
const requestApi = {
  sendRequest: async (tripId, requesterTripId, driverId) => {
    // requester_id берётся из JWT на бэкенде — не передаём
    const res = await fetch(`${API_URL}/trip-requests/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('birge_token')}` },
      body: JSON.stringify({ trip_id: tripId, requester_trip_id: requesterTripId, driver_id: driverId }),
    });
    return res.json();
  },
  checkStatus: async (tripId) => {
    // requester_id берётся из JWT — не передаём в пути
    const res = await fetch(`${API_URL}/trip-requests/status/${tripId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('birge_token')}` },
    });
    return res.json();
  }
};

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const formatChipLabel = (d) => {
  if (!d) return 'Без даты';
  if (d === today) return '📅 Сегодня';
  if (d === tomorrow) return '📅 Завтра';
  const dt = new Date(d);
  return '📅 ' + dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export default function Matches({ matches = [], setMatches, onConnect, onCancel, isLoading = false, searchCriteria, currentUser, myTripId }) {
  const { t } = useTranslation();
  const [requestStatus, setRequestStatus] = useState({}); // { [tripId]: 'pending'|'accepted'|'declined' }
  const connectedRef = useRef(false); // защита от повторного вызова onConnect
  const [activeDateFilter, setActiveDateFilter] = useState(searchCriteria?.date || null);

  // Синхронизируем фильтр при смене критериев поиска
  useEffect(() => {
    setActiveDateFilter(searchCriteria?.date || null);
  }, [searchCriteria?.date]);

  // Уникальные даты из матчей для чипсов
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(matches.map(m => m.date || null))];
    return dates.sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });
  }, [matches]);

  // Отфильтрованные матчи
  const filteredMatches = useMemo(() => {
    if (!activeDateFilter) return matches;
    return matches.filter(m => m.date === activeDateFilter || (!m.date && activeDateFilter === null));
  }, [matches, activeDateFilter]);

  // Автополлинг за совпадениями
  useEffect(() => {
    if (isLoading || !searchCriteria || !currentUser) return;
    const pollInterval = setInterval(async () => {
      try {
        const found = await api.findMatches(
          currentUser.id, searchCriteria.role, searchCriteria.from,
          searchCriteria.to, searchCriteria.time, 1, searchCriteria.date || null
        );
        if (found.length > 0) {
          const mapped = found.map(m => ({
            id: m.id, role: m.role,
            from: m.origin, to: m.destination,
            origin: m.origin, destination: m.destination,
            time: m.time, date: m.date || null,
            price_per_seat: m.price_per_seat || 0,
            userId: m.user_id, user_id: m.user_id,
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

  // Для пассажира: SSE (мгновенные уведомления) + fallback polling каждые 15 сек
  useEffect(() => {
    if (!currentUser || searchCriteria?.role !== 'passenger' || matches.length === 0) return;
    connectedRef.current = false;

    const handleStatusUpdate = (st) => {
      if (!st?.status || st.status === 'not_sent') return;
      setRequestStatus(prev => ({ ...prev, [st.trip_id]: st.status }));
      if (st.status === 'accepted' && !connectedRef.current) {
        connectedRef.current = true;
        const matchedTrip = matches.find(m => m.id === st.trip_id) || matches[0];
        const chatTripId = st.trip_id || matchedTrip.id;
        onConnect({ ...matchedTrip, id: chatTripId, requestInfo: st });
      }
    };

    // --- SSE: мгновенное уведомление от бэкенда ---
    let es = null;
    const token = localStorage.getItem('birge_token');
    if (token && typeof EventSource !== 'undefined') {
      // EventSource не поддерживает кастомные заголовки — передаём токен через ?token=
      es = new EventSource(`${API_URL}/trip-requests/events/${currentUser.id}?token=${encodeURIComponent(token)}`);

      es.addEventListener('request_update', (e) => {
        try {
          const data = JSON.parse(e.data);
          // Обрабатываем ответ водителя (accepted/declined)
          handleStatusUpdate(data);
          // Обрабатываем SSE-событие завершения поездки водителем
          if (data?.event === 'trip_completed' && !connectedRef.current) {
            connectedRef.current = true;
            const matchedTrip = matches.find(m => m.id === data.trip_id) || matches[0];
            if (matchedTrip) onConnect({ ...matchedTrip, id: data.trip_id, requestInfo: { status: 'completed', trip_id: data.trip_id } });
          }
        } catch (_) { }
      });

      es.onerror = () => {
        // SSE недоступен или соединение разорвано — fallback polling подхватит
      };
    }

    // --- Fallback polling: каждые 15 сек (резервный вариант если SSE не работает) ---
    const pollReqStatus = setInterval(async () => {
      if (connectedRef.current) return; // уже подключились через SSE
      for (const trip of matches) {
        try {
          const st = await requestApi.checkStatus(trip.id);
          handleStatusUpdate(st);
        } catch (e) { }
      }
    }, 15000);

    return () => {
      es?.close();
      clearInterval(pollReqStatus);
    };
  }, [currentUser, matches, searchCriteria]);

  const handleSendRequest = async (trip) => {
    if (!currentUser || !myTripId) return;
    setRequestStatus(prev => ({ ...prev, [trip.id]: 'sending' }));
    try {
      // requester_id берётся из JWT — не передаём
      await requestApi.sendRequest(trip.id, myTripId, trip.user_id);
      setRequestStatus(prev => ({ ...prev, [trip.id]: 'pending' }));
    } catch (e) {
      setRequestStatus(prev => ({ ...prev, [trip.id]: null }));
    }
  };

  const isDriver = searchCriteria?.role === 'driver';

  if (isLoading) {
    return (
      <div className="matches screen-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ color: 'var(--dark)', margin: 0 }}>{t('matches.searching')}</h2>
          <button
            onClick={onCancel}
            style={{
              background: '#fee2e2', color: '#dc2626', border: 'none',
              padding: '7px 14px', borderRadius: 10, fontWeight: 600,
              fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 5,
            }}
          >
            ✕ Отмена
          </button>
        </div>
        <div className="matches-list"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="matches screen-content glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <Clock size={48} color="#9ca3af" style={{ margin: '0 auto 1rem auto' }} />
        <h3>{t('matches.empty')}</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Ищем попутчиков, подождите...</p>
        <button
          onClick={onCancel}
          style={{
            background: '#fee2e2', color: '#dc2626', border: 'none',
            padding: '10px 24px', borderRadius: 12, fontWeight: 600,
            fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          ✕ Отменить поиск
        </button>
      </div>
    );
  }

  return (
    <div className="matches screen-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ color: 'var(--dark)', margin: 0 }}>
          {isDriver ? 'Запросы пассажиров' : 'Найденные водители'}
        </h2>
        <button
          onClick={onCancel}
          style={{
            background: '#fee2e2', color: '#dc2626', border: 'none',
            padding: '7px 14px', borderRadius: 10, fontWeight: 600,
            fontSize: '0.82rem', cursor: 'pointer',
          }}
        >
          ✕ Отменить
        </button>
      </div>

      {/* Фильтр-чипсы по дате */}
      {uniqueDates.length > 1 && (
        <div className="date-chips-row">
          <button
            className={`date-chip ${activeDateFilter === null ? 'active' : ''}`}
            onClick={() => setActiveDateFilter(null)}
          >
            Все
          </button>
          {uniqueDates.map(d => (
            <button
              key={d || 'null'}
              className={`date-chip ${activeDateFilter === d ? 'active' : ''}`}
              onClick={() => setActiveDateFilter(d)}
            >
              {formatChipLabel(d)}
            </button>
          ))}
        </div>
      )}

      <div className="matches-list">
        {filteredMatches.map(trip => {
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div className="match-time glass-badge">{trip.time}</div>
                  {trip.date && (
                    <div className="date-badge">
                      <Calendar size={10} />
                      {formatChipLabel(trip.date).replace('📅 ', '')}
                    </div>
                  )}
                  {/* Цена за место */}
                  {trip.role === 'driver' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      background: trip.price_per_seat > 0 ? '#f0fdf4' : '#f9fafb',
                      border: `1px solid ${trip.price_per_seat > 0 ? '#bbf7d0' : '#e5e7eb'}`,
                      borderRadius: 10, padding: '2px 8px',
                    }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        color: trip.price_per_seat > 0 ? '#059669' : '#9ca3af',
                      }}>
                        {trip.price_per_seat > 0 ? `~${trip.price_per_seat} сом` : 'Договориться'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Маршрут */}
              <div className="match-route">
                <div className="route-point">📍 {trip.from}</div>
                <div className="route-divider"></div>
                <div className="route-point">🏁 {trip.to}</div>
              </div>

              {/* Кнопка — разная в зависимости от роли */}
              {isDriver ? (
                <div style={{
                  textAlign: 'center', padding: '10px',
                  background: '#f0fdf4', borderRadius: '10px',
                  color: '#059669', fontSize: '0.85rem', fontWeight: 500
                }}>
                  ✅ Совпадение найдено! Дождитесь запроса от пассажира — появится всплывающее окно.
                </div>
              ) : (
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

        /* Date chips */
        .date-chips-row {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-bottom: 1rem; overflow-x: auto;
          scrollbar-width: none; padding-bottom: 2px;
        }
        .date-chips-row::-webkit-scrollbar { display: none; }
        .date-chip {
          flex-shrink: 0;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1.5px solid #e5e7eb;
          background: white;
          font-size: 0.8rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .date-chip:hover { border-color: #6366f1; color: #6366f1; }
        .date-chip.active {
          background: #6366f1;
          border-color: #6366f1;
          color: white;
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
        }

        /* Date badge on card */
        .date-badge {
          display: flex; align-items: center; gap: 3px;
          font-size: 0.7rem; font-weight: 600;
          color: #6366f1; background: #ede9fe;
          padding: 2px 8px; border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
