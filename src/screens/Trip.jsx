import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Navigation, MessageCircle, Star, ShieldCheck, Car, Zap, Users, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import Chat from '../components/Chat';
import { api } from '../utils/api';
import TripAcceptedCard from '../components/TripAcceptedCard';

export default function Trip({ trip, currentUser, onPanic, onFinish, onNewMessage }) {
  const { t } = useTranslation();
  const [goingNotified, setGoingNotified] = useState(false);
  const [passengers, setPassengers] = useState([]);
  const [seats, setSeats] = useState(trip?.seats || 3);

  // Определяем: поездка запланирована (дата в будущем)?
  const today = new Date().toISOString().slice(0, 10);
  const tripDate = trip?.date && trip.date !== 'Сегодня' ? trip.date : today;
  const isScheduled = tripDate > today;

  // Данные: isDriver из trip.isDriver — определяется ДО useState с проверкой
  const isDriver = trip?.isDriver || false;
  const tripId = trip?.id;

  // Для пассажира: показываем карточку "Поездка принята" при первом входе
  // Ключ хранится в sessionStorage чтобы не показывать повторно при переключении вкладок
  const [showAcceptedCard, setShowAcceptedCard] = useState(() => {
    if (isDriver || !tripId) return false;
    const key = `birge_trip_card_shown_${tripId}`;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  });

  // Загружаем список пассажиров для водителя (и обновляем каждые 5 сек)
  useEffect(() => {
    if (!trip?.id || !isDriver) return;
    const load = () => {
      api.getTripPassengers(trip.id).then(data => {
        setPassengers(data.passengers || []);
        setSeats(data.seats || 3);
      });
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [trip?.id, isDriver]);

  if (!trip) return null;

  const chatRoomId = trip.id;
  const fromLocation = trip.from || trip.origin || '';
  const toLocation = trip.to || trip.destination || '';

  // Для пассажира — партнёр-водитель
  const partner = trip.user || {};
  const partnerName = isDriver
    ? (passengers.length > 0 ? `${passengers.length} пассажира` : 'Ждём пассажиров...')
    : (partner.name || 'Водитель');
  const partnerPhoto = partner.photo || `https://i.pravatar.cc/150?u=${trip.user_id}`;
  const partnerRating = partner.trust_rating || 5.0;
  const partnerVerified = partner.is_verified || false;

  // Данные машины (только для пассажира)
  const carModel = trip.driverCarModel;
  const carPlate = trip.driverCarPlate;
  const carColor = trip.driverCarColor;

  const sendGoingMessage = () => {
    const WS_URL = (import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com')
      .replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${WS_URL}/ws/chat/${chatRoomId}/${currentUser.id}`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ text: `🚗 Выезжаю! Буду через ~5 минут. Выходите ✅` }));
      setTimeout(() => ws.close(), 500);
    };
    setGoingNotified(true);
  };

  return (
    <div className="trip screen-content">

      {/* Карточка "Поездка принята" — только для пассажира, только при первом открытии */}
      {showAcceptedCard && !isDriver && (
        <TripAcceptedCard
          trip={trip}
          onDismiss={() => setShowAcceptedCard(false)}
        />
      )}

      {/* Заголовок поездки */}
      <div className="trip-header glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '3px' }}>🚗 {t('trip.title')}</h2>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{trip.date || 'Сегодня'} · {trip.time}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: isScheduled ? '#ede9fe' : '#d1fae5',
              color: isScheduled ? '#7c3aed' : '#059669',
              padding: '2px 10px', borderRadius: 20,
              fontSize: '0.72rem', fontWeight: 600, marginTop: 5
            }}>
              {isScheduled ? (
                <><Calendar size={11} /> Запланировано</>
              ) : (
                <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> В процессе</>
              )}
            </div>
          </div>
          <button className="panic-btn" onClick={onPanic} title="Тревожная кнопка">
            <AlertTriangle size={20} />
          </button>
        </div>

        {/* Для ВОДИТЕЛЯ — счётчик мест + список пассажиров */}
        {isDriver ? (
          <div className="passengers-section">
            <div className="seats-counter">
              <Users size={14} color="#10b981" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                {passengers.length} / {seats} пассажиров
              </span>
              <div className="seats-dots">
                {Array.from({ length: seats }).map((_, i) => (
                  <div key={i} className={`seat-dot ${i < passengers.length ? 'taken' : 'free'}`} />
                ))}
              </div>
            </div>

            {passengers.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.82rem', textAlign: 'center', margin: '8px 0' }}>
                Ожидаем пассажиров...
              </p>
            ) : (
              <div className="passengers-list">
                {passengers.map(p => (
                  <div key={p.id} className="passenger-row">
                    <img src={p.photo || `https://i.pravatar.cc/40?u=${p.id}`} alt={p.name}
                      style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #d1fae5' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1f2937' }}>{p.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star size={10} fill="#f59e0b" color="#f59e0b" />
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.trust_rating?.toFixed(1)}</span>
                        {p.is_verified && <ShieldCheck size={11} color="#10b981" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Кнопка "Выезжаю!" — только если поездка сегодня */}
            {isScheduled ? (
              <div style={{
                textAlign: 'center',
                background: '#f5f3ff',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: '#7c3aed',
                fontWeight: 500,
              }}>
                🕐 Кнопка "Выезжаю!" будет доступна в день поездки
              </div>
            ) : (
              <button
                className={`going-btn ${goingNotified ? 'going-btn-done' : ''}`}
                disabled={goingNotified || passengers.length === 0}
                onClick={sendGoingMessage}
              >
                {goingNotified ? '✅ Уведомление отправлено!' : <><Zap size={15} /> Уведомить всех — Выезжаю!</>}
              </button>
            )}
          </div>
        ) : (
          /* Для ПАССАЖИРА — карточка водителя */
          <div className="partner-card">
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={partnerPhoto} alt={partnerName}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
              {partnerVerified && (
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#10b981', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                  <ShieldCheck size={9} color="white" />
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>{partnerName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{partnerRating.toFixed(1)}</span>
              </div>
              {carModel && (
                <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '2px 8px' }}>
                    <Car size={11} color="#10b981" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46' }}>
                      {carModel}{carColor ? ` · ${carColor}` : ''}
                    </span>
                  </div>
                  {carPlate && (
                    <div style={{ background: '#1f2937', color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {carPlate}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} color="#10b981" /> {fromLocation}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Navigation size={11} color="#f43f5e" /> {toLocation}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Баннер запланированной поездки */}
      {isScheduled && (
        <div style={{
          background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
          border: '1.5px solid #c4b5fd',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Calendar size={22} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#4c1d95' }}>
              Поездка запланирована
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6d28d9', marginTop: 2 }}>
              {trip.date} в {trip.time} — ждём дня поездки
            </div>
          </div>
        </div>
      )}

      {/* Карта */}
      <div style={{ borderRadius: 16, overflow: 'hidden' }}>
        <RealMap from={fromLocation} to={toLocation} height="200px" />
      </div>

      {/* Чат — групповой для водителя, 1-на-1 для пассажира */}
      <div className="trip-chat">
        <h3 style={{ fontSize: '0.9rem', color: 'var(--dark)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
          <MessageCircle size={15} />
          {isDriver && passengers.length > 1 ? `Групповой чат (${passengers.length})` : t('trip.chat')}
        </h3>
        <Chat tripId={chatRoomId} currentUser={currentUser} partnerName={partnerName} onNewMessage={onNewMessage} />
      </div>

      <button className="primary-btn finish-btn" onClick={onFinish}>
        Завершить поездку
      </button>

      <style>{`
        .trip { display: flex; flex-direction: column; gap: 1rem; padding-bottom: 20px; }
        .panic-btn {
          background: #fee2e2; color: #dc2626; border: none;
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(220,38,38,0.2);
        }
        .panic-btn:hover { background: #fca5a5; }

        /* Passengers section (driver) */
        .passengers-section { margin-top: 12px; }
        .seats-counter {
          display: flex; align-items: center; gap: 8px;
          background: #f0fdf4; border-radius: 10px; padding: 8px 12px;
          margin-bottom: 10px;
        }
        .seats-dots { display: flex; gap: 4px; margin-left: auto; }
        .seat-dot {
          width: 12px; height: 12px; border-radius: 3px;
          transition: background 0.2s;
        }
        .seat-dot.taken { background: #10b981; }
        .seat-dot.free { background: #d1d5db; }

        .passengers-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
        .passenger-row {
          display: flex; align-items: center; gap: 10px;
          background: #f9fafb; border-radius: 10px; padding: 8px 10px;
        }

        /* Going button */
        .going-btn {
          width: 100%; padding: 10px 16px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white; border: none; border-radius: 12px;
          font-size: 0.88rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          box-shadow: 0 3px 12px rgba(16,185,129,0.3);
        }
        .going-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(16,185,129,0.4); }
        .going-btn:disabled:not(.going-btn-done) { background: #e5e7eb; color: #9ca3af; box-shadow: none; cursor: default; }
        .going-btn-done { background: #d1fae5 !important; color: #065f46 !important; box-shadow: none !important; cursor: default !important; }

        /* Partner card (passenger) */
        .partner-card {
          display: flex; align-items: flex-start; gap: 10px;
          background: #f9fafb; border-radius: 12px; padding: 10px 12px; margin-top: 10px;
        }

        .trip-chat { flex: 1; display: flex; flex-direction: column; }
        .finish-btn {
          background: linear-gradient(135deg, #f43f5e, #e11d48) !important;
          box-shadow: 0 4px 12px rgba(244,63,94,0.3);
        }
      `}</style>
    </div>
  );
}
