import React from 'react';
import { AlertTriangle, User, MapPin, Navigation, MessageCircle, Star, ShieldCheck, Car } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import Chat from '../components/Chat';

export default function Trip({ trip, currentUser, onPanic, onFinish, onNewMessage }) {
  const { t } = useTranslation();
  if (!trip) return null;

  // trip.id — это реальный ID поездки из БД (числовой)
  // Это правильный ID для чат-комнаты и загрузки истории
  const chatRoomId = trip.id;

  // Данные маршрута — поддерживаем оба формата (from/to и origin/destination)
  const fromLocation = trip.from || trip.origin || '';
  const toLocation = trip.to || trip.destination || '';

  // Данные попутчика
  const partner = trip.user || {};
  const partnerName = partner.name || t('matches.passenger');
  const partnerPhoto = partner.photo || `https://i.pravatar.cc/150?u=${trip.userId || trip.user_id}`;
  const partnerRating = partner.trust_rating || partner.trustRating || 5.0;
  const partnerVerified = partner.is_verified || partner.isVerified || false;

  return (
    <div className="trip screen-content">
      <div className="trip-header glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>🚗 {t('trip.title')}</h2>
            <div style={{ color: '#4b5563', fontSize: '0.82rem' }}>{trip.date || ''} · {trip.time}</div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#d1fae5',
              color: '#059669',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginTop: '6px'
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
            <img src={partnerPhoto} alt={partnerName} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
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
            {trip.role === 'passenger' && partner.car_model && (
              <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Car size={12} /> {partner.car_model} {partner.car_plate && `· ${partner.car_plate}`}
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
          height: 100%;
          padding-bottom: 20px;
          animation: slideUp 0.3s ease-out;
        }
        .partner-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f9fafb;
          border-radius: 12px;
          padding: 10px 12px;
          margin-top: 12px;
        }
        .trip-map-container {
          border-radius: 16px;
          overflow: hidden;
        }
        .panic-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(220, 38, 38, 0.2);
          flex-shrink: 0;
        }
        .panic-btn:hover { background: #fca5a5; transform: scale(1.05); }
        .panic-btn:active { transform: scale(0.95); }
        .trip-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .finish-btn {
          background: linear-gradient(135deg, #f43f5e, #e11d48) !important;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);
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
