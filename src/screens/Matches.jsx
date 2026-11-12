import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Star, CheckCircle, Clock, Car, Send, Loader, Calendar, MapPin, Navigation, X, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SkeletonCard from '../components/SkeletonCard';
import { api, API_URL } from '../utils/api';
import { localDateStr } from '../utils/date';


// Вспомогательные функции API для запросов
const requestApi = {
  sendRequest: async (tripId, requesterTripId, driverId) => {
    return api.sendTripRequest(tripId, requesterTripId, driverId);
  },
  checkStatus: async (tripId) => {
    return api.checkRequestStatus(tripId);
  }
};

const today = localDateStr();
const tomorrow = localDateStr(1);

const formatChipLabel = (d) => {
  if (!d) return 'Без даты';
  if (d === today) return 'Сегодня';
  if (d === tomorrow) return 'Завтра';
  const dt = new Date(d);
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export default function Matches({
  matches = [],
  setMatches,
  onConnect,
  onCancel,
  isLoading = false,
  searchCriteria,
  currentUser,
  myTripId,
  activeTrip,
  onGoToActiveTrip,
}) {
  const { t } = useTranslation();
  const [requestStatus, setRequestStatus] = useState({}); // { [tripId]: 'pending'|'accepted'|'declined' }
  const [requestError, setRequestError] = useState('');
  const connectedRef = useRef(false); // защита от повторного вызова onConnect
  const [activeDateFilter, setActiveDateFilter] = useState(searchCriteria?.date || null);

  // Refs, чтобы SSE-эффект не пересоздавался при каждом обновлении списка матчей.
  const matchesRef = useRef(matches);
  const onConnectRef = useRef(onConnect);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { onConnectRef.current = onConnect; }, [onConnect]);

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
        const mapped = (found || []).map(m => ({
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
        // Всегда обновляем: если водитель/пассажир завершил поездку и бэкенд вернул 0,
        // список очищается, убирая завершенных попутчиков из интерфейса
        setMatches(mapped);
      } catch (e) { console.error('Auto-poll error:', e); }
    }, 6000);
    return () => clearInterval(pollInterval);
  }, [isLoading, searchCriteria, currentUser, setMatches]);

  // Для пассажира: SSE (мгновенные уведомления) + fallback polling каждые 15 сек
  useEffect(() => {
    if (!currentUser || searchCriteria?.role !== 'passenger') return;
    connectedRef.current = false;

    const handleStatusUpdate = (st) => {
      if (!st?.status || st.status === 'not_sent') return;
      setRequestStatus(prev => ({ ...prev, [st.trip_id]: st.status }));
      if (st.status === 'accepted' && !connectedRef.current) {
        connectedRef.current = true;
        const currentMatches = matchesRef.current || [];
        const matchedTrip = currentMatches.find(m => m.id === st.trip_id) || currentMatches[0];
        const chatTripId = st.trip_id || matchedTrip?.id;
        if (chatTripId) {
          Promise.resolve(onConnectRef.current({ ...matchedTrip, id: chatTripId, requestInfo: st }))
            .catch(() => { connectedRef.current = false; });
        }
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
            const currentMatches = matchesRef.current || [];
            const matchedTrip = currentMatches.find(m => m.id === data.trip_id) || currentMatches[0];
            if (matchedTrip) {
              Promise.resolve(onConnectRef.current({
                ...matchedTrip,
                id: data.trip_id,
                requestInfo: { status: 'completed', trip_id: data.trip_id },
              })).catch(() => { connectedRef.current = false; });
            }
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
      for (const trip of (matchesRef.current || [])) {
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
  }, [currentUser, searchCriteria]);

  const handleSendRequest = async (trip) => {
    if (!currentUser || !myTripId) return;
    setRequestError('');
    setRequestStatus(prev => ({ ...prev, [trip.id]: 'sending' }));
    try {
      // requester_id берётся из JWT — не передаём
      await requestApi.sendRequest(trip.id, myTripId, trip.user_id);
      setRequestStatus(prev => ({ ...prev, [trip.id]: 'pending' }));
    } catch (e) {
      setRequestStatus(prev => ({ ...prev, [trip.id]: null }));
      setRequestError(e.message);
    }
  };

  const isDriver = searchCriteria?.role === 'driver';

  if (activeTrip) {
    return (
      <div className="matches screen-content">
        <div className="glass-panel" style={{ padding: '24px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', padding: '6px 14px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, marginBottom: 16 }}>
            <CheckCircle2 size={14} />
            <span>{activeTrip.isScheduled ? 'Запланированная поездка' : 'Поездка в процессе'}</span>
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
            {activeTrip.origin} → {activeTrip.destination}
          </h3>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px auto' }}>
            {activeTrip.role === 'passenger'
              ? `Вы уже едете с водителем ${activeTrip.user?.name || activeTrip.driverName || 'водителем'}. Чат и статус поездки открыты во вкладке «В пути».`
              : `Поездка сформирована. Занято мест: ${activeTrip.seats_taken || 1} из ${activeTrip.seats || 3}. Управление поездкой доступно во вкладке «В пути».`}
          </p>

          <button
            type="button"
            onClick={onGoToActiveTrip}
            className="primary-btn"
            style={{ width: '100%', maxWidth: 320, margin: '0 auto', padding: '12px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span>Перейти к поездке</span>
          </button>
        </div>
      </div>
    );
  }

  if (!searchCriteria && matches.length === 0) {
    return (
      <div className="matches screen-content glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
        <Navigation size={42} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.18rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-main)' }}>Нет активного поиска</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', maxWidth: 320, margin: '0 auto 1.5rem auto' }}>
          Укажите откуда и куда вы едете на главном экране, чтобы Birge подобрал подходящих попутчиков.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="primary-btn"
          style={{ width: 'auto', padding: '10px 24px', borderRadius: 10, fontWeight: 700, margin: '0 auto' }}
        >
          Перейти к поиску
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="matches screen-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ color: 'var(--dark)', margin: 0 }}>{t('matches.searching')}</h2>
          <button
            onClick={onCancel}
            style={{
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '7px 14px', borderRadius: 8, fontWeight: 700,
              fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 5,
            }}
          >
            <X size={14} /> Отмена
          </button>
        </div>
        <div className="matches-list"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="matches screen-content glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <Clock size={40} color="var(--text-subtle)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>{t('matches.empty')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>Ищем подходящих попутчиков по маршруту...</p>
        <button
          onClick={onCancel}
          style={{
            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '10px 24px', borderRadius: 10, fontWeight: 700,
            fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
          }}
        >
          <X size={15} /> Отменить поиск
        </button>
      </div>
    );
  }

  return (
    <div className="matches screen-content">
      {requestError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 10, padding: '10px 14px', fontSize: '0.84rem', fontWeight: 600, marginBottom: 12 }}>
          {requestError}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
          {isDriver ? 'Запросы пассажиров' : 'Доступные водители'}
        </h2>
        <button
          onClick={onCancel}
          style={{
            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '7px 12px', borderRadius: 8, fontWeight: 700,
            fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          <X size={13} /> Отменить
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
                      {formatChipLabel(trip.date)}
                    </div>
                  )}
                  {/* Цена за место */}
                  {trip.role === 'driver' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8, padding: '2px 8px',
                    }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        color: trip.price_per_seat > 0 ? 'var(--primary)' : 'var(--text-muted)',
                      }}>
                        {trip.price_per_seat > 0 ? `${trip.price_per_seat} сом` : 'Договориться'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Маршрут */}
              <div className="match-route">
                <div className="route-point">
                  <MapPin size={13} className="text-primary" />
                  <span>{trip.from}</span>
                </div>
                <div className="route-divider"></div>
                <div className="route-point">
                  <Navigation size={13} className="text-danger" />
                  <span>{trip.to}</span>
                </div>
              </div>

              {/* Кнопка — разная в зависимости от роли */}
              {isDriver ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  textAlign: 'left', padding: '10px 12px',
                  background: 'var(--bg-subtle)', borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600
                }}>
                  <CheckCircle2 size={16} />
                  <span>Совпадение найдено. Ожидайте запрос от попутчика.</span>
                </div>
              ) : (
                <button
                  className="primary-btn match-btn"
                  onClick={() => status ? null : handleSendRequest(trip)}
                  disabled={!!status}
                  style={{
                    background: status === 'accepted' ? '#10b981'
                      : status === 'declined' ? '#ef4444'
                        : status === 'pending' ? '#f59e0b'
                          : 'var(--primary)',
                    color: 'white',
                    opacity: status ? 0.9 : 1,
                    cursor: status ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {status === 'sending' && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {status === 'pending' && 'Ожидание ответа водителя...'}
                  {status === 'accepted' && 'Принят. Открываем чат...'}
                  {status === 'declined' && 'Отклонен'}
                  {!status && <><Send size={15} /> Запросить поездку</>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .matches-list { display: flex; flex-direction: column; gap: 1rem; }
        .match-card {
          padding: 1.15rem;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius);
          box-shadow: var(--card-shadow);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .match-card:hover { transform: translateY(-2px); box-shadow: var(--card-shadow-hover); }
        .match-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
        .user-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--bg-app); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .user-info { flex: 1; }
        .user-name { font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 4px; }
        .user-rating { font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
        .glass-badge { background: rgba(16,185,129,0.15); color: var(--primary); padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; }
        .match-route { background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px; margin-bottom: 1rem; }
        .route-point { font-size: 0.85rem; color: var(--text-muted); }
        .route-divider { height: 12px; width: 2px; background: var(--border-subtle); margin: 4px 0 4px 6px; }
        .match-btn { margin-top: 0; padding: 10px; width: 100%; border-radius: 12px; font-weight: 600; font-size: 0.9rem; }
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
          border: 1.5px solid var(--border-subtle);
          background: var(--bg-card);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .date-chip:hover { border-color: var(--primary); color: var(--primary); }
        .date-chip.active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
          box-shadow: 0 2px 8px var(--primary-glow);
        }

        /* Date badge on card */
        .date-badge {
          display: flex; align-items: center; gap: 3px;
          font-size: 0.7rem; font-weight: 600;
          color: #6366f1; background: rgba(99,102,241,0.15);
          padding: 2px 8px; border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
