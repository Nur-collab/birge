import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, MapPin, Navigation, Clock, Users, Car,
  Star, ShieldCheck, ChevronRight, RefreshCw, Trash2, ArrowRight
} from 'lucide-react';
import { api } from '../utils/api';

export default function ScheduledTrips({ currentUser, onOpenTrip, onCancel }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const formatDate = (d) => {
    if (!d) return '—';
    if (d === today) return 'Сегодня';
    if (d === tomorrow) return 'Завтра';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
  };

  const daysUntil = (d) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'завтра';
    return `через ${diff} дн.`;
  };

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const data = await api.getScheduledTrips();
    setTrips(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    // Обновляем каждые 30 сек
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleCancel = async (trip) => {
    // Водитель отменяет свою поездку (trip_id),
    // пассажир отменяет свой запрос (requester_trip_id).
    const idToCancel = trip.role === 'driver' ? trip.trip_id : trip.requester_trip_id;
    if (!idToCancel) return;

    const confirmMsg =
      trip.role === 'driver'
        ? 'Отменить запланированную поездку? Все пассажиры будут уведомлены.'
        : 'Отказаться от поездки с этим водителем?';

    if (!window.confirm(confirmMsg)) return;

    setCancellingId(trip.trip_id);
    await api.cancelScheduledTrip(idToCancel);
    setTrips(prev => prev.filter(t => t.trip_id !== trip.trip_id));
    setCancellingId(null);
  };

  if (loading) {
    return (
      <div className="sched-screen">
        <div className="sched-header">
          <h2 className="sched-title">📅 Запланированные поездки</h2>
        </div>
        <div className="sched-skeleton-list">
          {[1, 2].map(i => (
            <div key={i} className="sched-skeleton-card">
              <div className="skel skel-date" />
              <div className="skel skel-route" />
              <div className="skel skel-route short" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sched-screen">
      {/* Заголовок */}
      <div className="sched-header">
        <div>
          <h2 className="sched-title">📅 Запланированные</h2>
          <p className="sched-subtitle">
            {trips.length > 0
              ? `${trips.length} предстоящих поездок`
              : 'Нет запланированных поездок'}
          </p>
        </div>
        <button
          className={`sched-refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={() => load(true)}
          title="Обновить"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {trips.length === 0 ? (
        /* Пустой стейт */
        <div className="sched-empty">
          <div className="sched-empty-icon">🗓️</div>
          <h3 className="sched-empty-title">Пока пусто</h3>
          <p className="sched-empty-text">
            Запланируйте поездку на завтра или следующую неделю —
            она появится здесь автоматически
          </p>
          <button className="primary-btn sched-cta-btn" onClick={onCancel}>
            ➕ Запланировать поездку
          </button>
        </div>
      ) : (
        <div className="sched-list">
          {trips.map((trip, idx) => (
            <div key={`${trip.trip_id}-${idx}`} className="sched-card">

              {/* Цветной акцент слева — зелёный для водителя, синий для пассажира */}
              <div className={`sched-card-accent ${trip.role === 'driver' ? 'accent-driver' : 'accent-passenger'}`} />

              {/* Верхняя строка: роль + дата */}
              <div className="sched-card-top">
                <div className="sched-role-badge">
                  {trip.role === 'driver' ? (
                    <><Car size={12} /> Водитель</>
                  ) : (
                    <><Users size={12} /> Пассажир</>
                  )}
                </div>
                <div className="sched-date-chip">
                  <Calendar size={12} />
                  <span>{formatDate(trip.date)}</span>
                  <span className="sched-days-until">({daysUntil(trip.date)})</span>
                </div>
              </div>

              {/* Маршрут */}
              <div className="sched-route">
                <div className="sched-route-row">
                  <div className="sched-dot green" />
                  <span className="sched-loc">{trip.origin}</span>
                </div>
                <div className="sched-route-line" />
                <div className="sched-route-row">
                  <div className="sched-dot red" />
                  <span className="sched-loc">{trip.destination}</span>
                </div>
              </div>

              {/* Время */}
              <div className="sched-time-row">
                <Clock size={13} color="#6366f1" />
                <span className="sched-time">{trip.time}</span>
                {trip.role === 'driver' && (
                  <div className="sched-seats-mini">
                    <Users size={12} color="#10b981" />
                    <span>{trip.seats_taken} / {trip.seats}</span>
                  </div>
                )}
              </div>

              {/* Пассажиры (для водителя) */}
              {trip.role === 'driver' && trip.passengers && trip.passengers.length > 0 && (
                <div className="sched-passengers">
                  <div className="sched-pass-label">Пассажиры:</div>
                  <div className="sched-pass-list">
                    {trip.passengers.map(p => (
                      <div key={p.id} className="sched-pass-row">
                        <img
                          src={p.photo || `https://i.pravatar.cc/40?u=${p.id}`}
                          alt={p.name}
                          className="sched-pass-photo"
                        />
                        <div className="sched-pass-info">
                          <span className="sched-pass-name">{p.name}</span>
                          <div className="sched-pass-rating">
                            <Star size={10} fill="#f59e0b" color="#f59e0b" />
                            <span>{p.trust_rating?.toFixed(1)}</span>
                            {p.is_verified && <ShieldCheck size={10} color="#10b981" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Водитель (для пассажира) */}
              {trip.role === 'passenger' && trip.driver && (
                <div className="sched-driver-card">
                  <img
                    src={trip.driver.photo || `https://i.pravatar.cc/40?u=${trip.driver.id}`}
                    alt={trip.driver.name}
                    className="sched-driver-photo"
                  />
                  <div className="sched-driver-info">
                    <div className="sched-driver-name">{trip.driver.name}</div>
                    <div className="sched-driver-rating">
                      <Star size={10} fill="#f59e0b" color="#f59e0b" />
                      <span>{trip.driver.trust_rating?.toFixed(1)}</span>
                      {trip.driver.is_verified && <ShieldCheck size={10} color="#10b981" />}
                    </div>
                    {trip.driver.car_model && (
                      <div className="sched-car-row">
                        <div className="sched-car-model">
                          <Car size={10} color="#10b981" />
                          {trip.driver.car_model}
                          {trip.driver.car_color ? ` · ${trip.driver.car_color}` : ''}
                        </div>
                        {trip.driver.car_plate && (
                          <div className="sched-car-plate">{trip.driver.car_plate}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Действия */}
              <div className="sched-actions">
                <button
                  className="sched-open-btn"
                  onClick={() => onOpenTrip(trip)}
                >
                  Открыть поездку <ChevronRight size={15} />
                </button>
                <button
                  className={`sched-cancel-btn ${cancellingId === trip.trip_id ? 'loading' : ''}`}
                  onClick={() => handleCancel(trip)}
                  disabled={cancellingId === trip.trip_id}
                  title={trip.role === 'driver' ? 'Отменить поездку' : 'Отказаться от поездки'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .sched-screen {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-bottom: 20px;
        }

        /* Header */
        .sched-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .sched-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #1f2937;
          margin: 0 0 2px 0;
        }
        .sched-subtitle {
          font-size: 0.78rem;
          color: #9ca3af;
          margin: 0;
        }
        .sched-refresh-btn {
          width: 38px; height: 38px;
          border-radius: 10px;
          border: 1.5px solid #e5e7eb;
          background: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .sched-refresh-btn:hover { background: #f3f4f6; color: #374151; }
        .sched-refresh-btn.spinning svg { animation: spin360 0.7s linear infinite; }
        @keyframes spin360 { to { transform: rotate(360deg); } }

        /* Skeleton */
        .sched-skeleton-list { display: flex; flex-direction: column; gap: 12px; }
        .sched-skeleton-card {
          background: #f9fafb; border-radius: 16px; padding: 18px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .skel {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }
        .skel-date { height: 18px; width: 60%; }
        .skel-route { height: 14px; width: 90%; }
        .skel-route.short { width: 70%; }
        @keyframes shimmer { to { background-position: -200% 0; } }

        /* Empty state */
        .sched-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          padding: 40px 20px;
          gap: 12px;
        }
        .sched-empty-icon { font-size: 3.5rem; }
        .sched-empty-title { font-size: 1.1rem; font-weight: 700; color: #1f2937; margin: 0; }
        .sched-empty-text { font-size: 0.83rem; color: #9ca3af; margin: 0; max-width: 260px; line-height: 1.5; }
        .sched-cta-btn {
          margin-top: 8px;
          width: auto !important;
          padding: 12px 24px !important;
          font-size: 0.9rem !important;
        }

        /* Cards list */
        .sched-list { display: flex; flex-direction: column; gap: 14px; }

        /* Card */
        .sched-card {
          background: white;
          border: 1.5px solid #f0f0f0;
          border-radius: 18px;
          padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sched-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }

        .sched-card-accent {
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 4px;
        }
        .accent-driver { background: linear-gradient(180deg, #10b981, #059669); }
        .accent-passenger { background: linear-gradient(180deg, #6366f1, #4f46e5); }

        /* Top row */
        .sched-card-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        .sched-role-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 700;
          background: #f0fdf4; color: #059669;
        }
        .accent-passenger ~ * .sched-role-badge,
        .sched-card:has(.accent-passenger) .sched-role-badge {
          background: #eef2ff; color: #4f46e5;
        }
        .sched-date-chip {
          display: flex; align-items: center; gap: 4px;
          background: #f8fafc; border: 1px solid #e5e7eb;
          border-radius: 20px; padding: 3px 10px;
          font-size: 0.72rem; color: #374151; font-weight: 600;
        }
        .sched-days-until { color: #6366f1; font-weight: 700; }

        /* Route */
        .sched-route {
          background: #f9fafb; border-radius: 10px; padding: 10px 12px;
          display: flex; flex-direction: column; gap: 0;
        }
        .sched-route-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
        .sched-route-line {
          height: 1px; background: #e5e7eb;
          margin: 0 0 0 7px; /* align with dot center */
        }
        .sched-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        }
        .sched-dot.green { background: #10b981; }
        .sched-dot.red { background: #f43f5e; }
        .sched-loc {
          font-size: 0.82rem; color: #374151; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1;
        }

        /* Time row */
        .sched-time-row {
          display: flex; align-items: center; gap: 6px;
        }
        .sched-time {
          font-size: 0.9rem; font-weight: 700; color: #1f2937; flex: 1;
        }
        .sched-seats-mini {
          display: flex; align-items: center; gap: 4px;
          background: #f0fdf4; border-radius: 8px; padding: 3px 8px;
          font-size: 0.75rem; font-weight: 600; color: #059669;
        }

        /* Passengers (driver view) */
        .sched-passengers { display: flex; flex-direction: column; gap: 6px; }
        .sched-pass-label { font-size: 0.72rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .sched-pass-list { display: flex; flex-direction: column; gap: 6px; }
        .sched-pass-row {
          display: flex; align-items: center; gap: 8px;
          background: #f9fafb; border-radius: 10px; padding: 7px 10px;
        }
        .sched-pass-photo {
          width: 32px; height: 32px; border-radius: 50%;
          object-fit: cover; border: 2px solid #d1fae5; flex-shrink: 0;
        }
        .sched-pass-info { display: flex; flex-direction: column; gap: 2px; }
        .sched-pass-name { font-size: 0.82rem; font-weight: 600; color: #1f2937; }
        .sched-pass-rating { display: flex; align-items: center; gap: 3px; font-size: 0.72rem; color: #6b7280; }

        /* Driver card (passenger view) */
        .sched-driver-card {
          display: flex; align-items: flex-start; gap: 10px;
          background: #f0f7ff; border: 1px solid #bfdbfe;
          border-radius: 12px; padding: 10px 12px;
        }
        .sched-driver-photo {
          width: 40px; height: 40px; border-radius: 50%;
          object-fit: cover; border: 2px solid white; flex-shrink: 0;
          box-shadow: 0 1px 6px rgba(0,0,0,0.1);
        }
        .sched-driver-info { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .sched-driver-name { font-size: 0.88rem; font-weight: 700; color: #1f2937; }
        .sched-driver-rating { display: flex; align-items: center; gap: 3px; font-size: 0.72rem; color: #6b7280; }
        .sched-car-row { display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap; }
        .sched-car-model {
          display: flex; align-items: center; gap: 4px;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 6px; padding: 2px 7px;
          font-size: 0.72rem; font-weight: 600; color: #065f46;
        }
        .sched-car-plate {
          background: #1f2937; color: white;
          border-radius: 5px; padding: 2px 7px;
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px;
        }

        /* Actions */
        .sched-actions { display: flex; gap: 8px; align-items: center; }
        .sched-open-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white; border: none; border-radius: 12px;
          font-size: 0.85rem; font-weight: 700;
          padding: 10px 14px; cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 3px 10px rgba(99,102,241,0.3);
        }
        .sched-open-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(99,102,241,0.4); }
        .sched-cancel-btn {
          width: 40px; height: 40px;
          border: 1.5px solid #fee2e2; border-radius: 12px;
          background: #fff5f5; color: #dc2626;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .sched-cancel-btn:hover:not(:disabled) { background: #fee2e2; }
        .sched-cancel-btn.loading { opacity: 0.5; cursor: wait; }
      `}</style>
    </div>
  );
}
