import React, { useState } from 'react';
import { AlertTriangle, MapPin, Navigation, MessageCircle, Star, ShieldCheck, Car, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import Chat from '../components/Chat';

export default function Trip({ trip, currentUser, onPanic, onFinish, onNewMessage }) {
  const { t } = useTranslation();
  const [goingNotified, setGoingNotified] = useState(false);

  if (!trip) return null;

  const chatRoomId = trip.id;
  const fromLocation = trip.from || trip.origin || '';
  const toLocation = trip.to || trip.destination || '';

  const partner = trip.user || {};
  const partnerName = partner.name || t('matches.passenger');
  const partnerPhoto = partner.photo || `https://i.pravatar.cc/150?u=${trip.userId || trip.user_id}`;
  const partnerRating = partner.trust_rating || 5.0;
  const partnerVerified = partner.is_verified || false;

  // Данные машины: для пассажира — из driverCarModel, для водителя — из myCarModel
  const isDriver = trip.isDriver || false;
  const carModel = isDriver ? trip.myCarModel : trip.driverCarModel;
  const carPlate = isDriver ? trip.myCarPlate : trip.driverCarPlate;
  const carColor = isDriver ? trip.myCarColor : trip.driverCarColor;

  const handleGoingNotification = (sendFn) => {
    const msg = `🚗 ${currentUser?.name || 'Водитель'} едет! Выходи через 5 минут.`;
    sendFn(msg);
    setGoingNotified(true);
  };

  return (
    <div className="trip screen-content">
      <div className="trip-header glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>🚗 {t('trip.title')}</h2>
            <div style={{ color: '#4b5563', fontSize: '0.82rem' }}>{trip.date || ''} · {trip.time}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: '#d1fae5', color: '#059669',
              padding: '3px 10px', borderRadius: '20px',
              fontSize: '0.75rem', fontWeight: 600, marginTop: '6px'
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              {t('matches.status.active')}
            </div>
          </div>
          <button className="panic-btn" onClick={onPanic} title="Тревожная кнопка">
            <AlertTriangle size={22} />
          </button>
        </div>

        {/* Карточка попутчика */}
        <div className="partner-card">
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={partnerPhoto} alt={partnerName}
              style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
            {partnerVerified && (
              <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#10b981', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                <ShieldCheck size={10} color="white" />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1f2937' }}>{partnerName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Star size={12} fill="#f59e0b" color="#f59e0b" />
              <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>{partnerRating.toFixed(1)}</span>
            </div>
            {/* Данные машины (водителя) */}
            {carModel && (
              <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '2px 8px' }}>
                  <Car size={12} color="#10b981" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065f46' }}>
                    {carModel}
                    {carColor ? ` · ${carColor}` : ''}
                  </span>
                </div>
                {carPlate && (
                  <div style={{ background: '#1f2937', color: 'white', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {carPlate}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: '#6b7280' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} color="#10b981" /> {fromLocation}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Navigation size={12} color="#f43f5e" /> {toLocation}
            </div>
          </div>
        </div>

        {/* Кнопка "Я еду!" — только для водителя */}
        {isDriver && (
          <button
            className={`going-btn ${goingNotified ? 'going-btn-done' : ''}`}
            disabled={goingNotified}
            onClick={() => {
              // Отправляем через ref Chat компонента — используем глобальный broadcast
              // Простой способ: отправляем через WebSocket напрямую
              const WS_URL = (import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com')
                .replace('https://', 'wss://').replace('http://', 'ws://');
              const ws = new WebSocket(`${WS_URL}/ws/chat/${chatRoomId}/${currentUser.id}`);
              ws.onopen = () => {
                ws.send(JSON.stringify({ text: `🚗 Еду к тебе! Буду через ~5 минут. Выходи ✅` }));
                setTimeout(() => ws.close(), 500);
              };
              setGoingNotified(true);
            }}
          >
            {goingNotified ? '✅ Уведомление отправлено!' : <><Zap size={16} /> Уведомить — Еду!</>}
          </button>
        )}
      </div>

      <div className="trip-map-container">
        <RealMap from={fromLocation} to={toLocation} height="220px" />
      </div>

      <div className="trip-chat">
        <h3 style={{ fontSize: '0.95rem', color: 'var(--dark)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={16} /> {t('trip.chat')}
        </h3>
        <Chat tripId={chatRoomId} currentUser={currentUser} partnerName={partnerName} onNewMessage={onNewMessage} />
      </div>

      <button className="primary-btn finish-btn" onClick={onFinish}>
        Завершить поездку
      </button>

      <style>{`
        .trip {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-bottom: 20px;
          animation: slideUp 0.3s ease-out;
        }
        .partner-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #f9fafb;
          border-radius: 12px;
          padding: 10px 12px;
          margin-top: 12px;
        }
        .trip-map-container { border-radius: 16px; overflow: hidden; }
        .panic-btn {
          background: #fee2e2; color: #dc2626;
          border: none; width: 44px; height: 44px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(220,38,38,0.2); flex-shrink: 0;
        }
        .panic-btn:hover { background: #fca5a5; transform: scale(1.05); }

        /* Кнопка Я еду! */
        .going-btn {
          width: 100%; margin-top: 10px;
          padding: 11px 16px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white; border: none; border-radius: 12px;
          font-size: 0.9rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }
        .going-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16,185,129,0.4);
        }
        .going-btn-done {
          background: #d1fae5 !important;
          color: #065f46 !important;
          box-shadow: none !important;
          cursor: default !important;
        }

        .trip-chat {
          flex: 1; display: flex; flex-direction: column;
        }
        .finish-btn {
          background: linear-gradient(135deg, #f43f5e, #e11d48) !important;
          box-shadow: 0 4px 12px rgba(244,63,94,0.3);
          margin-top: auto;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
