import React, { useState, useEffect } from 'react';
import { Star, Car, ShieldCheck, MapPin, Navigation, Clock, X, ChevronRight } from 'lucide-react';

/**
 * TripAcceptedCard — красивая карточка "Поездка принята" для пассажира.
 * Показывается поверх экрана Trip при первом открытии.
 *
 * Props:
 *   trip          — объект активной поездки (из App.jsx activeTrip)
 *   onDismiss     — callback при закрытии карточки (переход к чату)
 */
export default function TripAcceptedCard({ trip, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);

  // Авто-скрытие через 8 секунд
  useEffect(() => {
    const timer = setTimeout(() => handleDismiss(), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 400);
  };

  if (!visible) return null;

  const driver = trip?.user || {};
  const driverName = trip?.driverName || driver.name || 'Водитель';
  const driverPhoto = trip?.driverPhoto || driver.photo || `https://i.pravatar.cc/200?u=${driver.id || 1}`;
  const driverRating = (driver.trust_rating || 5.0).toFixed(1);
  const driverVerified = driver.is_verified || false;

  const carModel = trip?.driverCarModel;
  const carPlate = trip?.driverCarPlate;
  const carColor = trip?.driverCarColor;

  const fromLocation = trip?.from || trip?.origin || '';
  const toLocation = trip?.to || trip?.destination || '';
  const tripTime = trip?.time || '';

  // Вспомогательная функция для цвета машины → CSS-цвет
  const getCarColorDot = (color) => {
    if (!color) return '#9ca3af';
    const map = {
      'белый': '#f8fafc', 'белая': '#f8fafc',
      'чёрный': '#1f2937', 'чёрная': '#1f2937', 'черный': '#1f2937', 'черная': '#1f2937',
      'серый': '#6b7280', 'серая': '#6b7280',
      'красный': '#ef4444', 'красная': '#ef4444',
      'синий': '#3b82f6', 'синяя': '#3b82f6',
      'зелёный': '#10b981', 'зелёная': '#10b981', 'зеленый': '#10b981', 'зеленая': '#10b981',
      'жёлтый': '#f59e0b', 'жёлтая': '#f59e0b', 'желтый': '#f59e0b', 'желтая': '#f59e0b',
      'серебристый': '#d1d5db', 'серебристая': '#d1d5db',
      'бежевый': '#d4b896', 'бежевая': '#d4b896',
      'коричневый': '#92400e', 'коричневая': '#92400e',
    };
    return map[color.toLowerCase()] || '#9ca3af';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: animateOut
          ? 'rgba(0,0,0,0)'
          : 'rgba(0,0,0,0.55)',
        backdropFilter: animateOut ? 'blur(0)' : 'blur(8px)',
        transition: 'background 0.4s ease, backdrop-filter 0.4s ease',
        padding: '0 0 0 0',
      }}
      onClick={handleDismiss}
    >
      {/* Зелёный pulse-circle сверху */}
      <div style={{
        position: 'absolute',
        top: '12%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'rgba(16,185,129,0.15)',
        animation: 'pulse-ring 2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        top: 'calc(12% + 17px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 66,
        height: 66,
        borderRadius: '50%',
        background: 'rgba(16,185,129,0.25)',
        animation: 'pulse-ring 2s ease-in-out infinite 0.3s',
        pointerEvents: 'none',
      }} />

      {/* Иконка успеха */}
      <div style={{
        position: 'absolute',
        top: 'calc(12% + 25px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 50,
        height: 50,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        boxShadow: '0 4px 20px rgba(16,185,129,0.5)',
        zIndex: 10,
        pointerEvents: 'none',
      }}>✓</div>

      {/* Основная карточка */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'white',
          borderRadius: '28px 28px 0 0',
          padding: '0 0 32px 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
          animation: animateOut ? 'slideDown 0.4s ease-in forwards' : 'slideUp 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideDown {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100%); opacity: 0; }
          }
          @keyframes pulse-ring {
            0% { transform: translateX(-50%) scale(0.9); opacity: 0.8; }
            50% { transform: translateX(-50%) scale(1.1); opacity: 0.3; }
            100% { transform: translateX(-50%) scale(0.9); opacity: 0.8; }
          }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .tac-plate-badge {
            font-family: 'Courier New', monospace;
            font-weight: 800;
            font-size: 0.95rem;
            letter-spacing: 2px;
            background: #1f2937;
            color: white;
            padding: 4px 14px;
            border-radius: 6px;
            border: 2px solid #374151;
            text-transform: uppercase;
            box-shadow: inset 0 -2px 0 rgba(0,0,0,0.3);
          }
          .tac-btn-chat {
            width: 100%; padding: 16px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white; border: none; border-radius: 16px;
            font-size: 1rem; font-weight: 700;
            cursor: pointer; transition: all 0.2s;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            box-shadow: 0 6px 20px rgba(16,185,129,0.35);
            letter-spacing: 0.3px;
          }
          .tac-btn-chat:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 28px rgba(16,185,129,0.45);
          }
          .tac-color-dot {
            width: 14px; height: 14px; border-radius: 50%;
            border: 2px solid rgba(0,0,0,0.1);
            flex-shrink: 0;
          }
          .tac-avatar-ring {
            border-radius: 50%;
            padding: 3px;
            background: linear-gradient(135deg, #10b981, #34d399);
            display: inline-block;
          }
        `}</style>

        {/* Зелёная полоска прогресса (автозакрытие) */}
        <div style={{ height: 4, background: '#e5e7eb', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, height: '100%',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            animation: 'shrinkBar 8s linear forwards',
            width: '100%',
          }} />
          <style>{`
            @keyframes shrinkBar {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>

        {/* Кнопка закрыть */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: '50%',
            background: '#f3f4f6', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#6b7280',
            transition: 'background 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
        >
          <X size={16} />
        </button>

        {/* Заголовок */}
        <div style={{
          textAlign: 'center',
          padding: '28px 24px 20px',
          background: 'linear-gradient(180deg, #f0fdf4 0%, #white 100%)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#d1fae5', color: '#065f46',
            padding: '5px 14px', borderRadius: 20,
            fontSize: '0.78rem', fontWeight: 700,
            marginBottom: 10, letterSpacing: 0.3,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-badge 1.5s ease-in-out infinite' }} />
            ПОЕЗДКА ПОДТВЕРЖДЕНА
          </div>
          <style>{`@keyframes pulse-badge { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f2937', margin: '0 0 4px 0' }}>
            Водитель найден! 🎉
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.88rem', margin: 0 }}>
            Ваш водитель уже в пути
          </p>
        </div>

        {/* Профиль водителя */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f9fafb, #f0fdf4)',
            borderRadius: 20,
            padding: '20px',
            border: '1.5px solid #d1fae5',
            marginBottom: 14,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Декоративный круг */}
            <div style={{
              position: 'absolute', top: -30, right: -30,
              width: 100, height: 100, borderRadius: '50%',
              background: 'rgba(16,185,129,0.06)',
              pointerEvents: 'none',
            }} />

            {/* Аватар + имя */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div className="tac-avatar-ring">
                <img
                  src={driverPhoto}
                  alt={driverName}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    objectFit: 'cover', display: 'block',
                    border: '3px solid white',
                  }}
                  onError={e => { e.target.src = `https://i.pravatar.cc/200?u=${driver.id || 99}`; }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1f2937' }}>
                    {driverName}
                  </span>
                  {driverVerified && (
                    <div style={{
                      background: '#10b981', borderRadius: '50%',
                      width: 20, height: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ShieldCheck size={12} color="white" />
                    </div>
                  )}
                </div>
                {/* Рейтинг */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[1,2,3,4,5].map(i => (
                    <Star
                      key={i}
                      size={14}
                      fill={i <= Math.round(parseFloat(driverRating)) ? '#f59e0b' : 'none'}
                      color={i <= Math.round(parseFloat(driverRating)) ? '#f59e0b' : '#d1d5db'}
                    />
                  ))}
                  <span style={{ fontWeight: 700, color: '#1f2937', fontSize: '0.88rem', marginLeft: 3 }}>
                    {driverRating}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>рейтинг</span>
                </div>
              </div>
            </div>

            {/* Разделитель */}
            <div style={{ height: 1, background: '#e5e7eb', margin: '0 0 16px 0' }} />

            {/* Данные машины */}
            {carModel ? (
              <div>
                <div style={{
                  fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af',
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
                }}>
                  Автомобиль
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Иконка машины */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(245,158,11,0.2)',
                  }}>
                    🚗
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937', marginBottom: 6 }}>
                      {carModel}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Цвет */}
                      {carColor && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: 'white', border: '1.5px solid #e5e7eb',
                          borderRadius: 20, padding: '3px 10px',
                        }}>
                          <div
                            className="tac-color-dot"
                            style={{ background: getCarColorDot(carColor) }}
                          />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                            {carColor}
                          </span>
                        </div>
                      )}
                      {/* Номер */}
                      {carPlate && (
                        <span className="tac-plate-badge">
                          {carPlate.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 12,
                background: '#fffbeb', border: '1px solid #fde68a',
              }}>
                <Car size={16} color="#f59e0b" />
                <span style={{ fontSize: '0.82rem', color: '#92400e' }}>
                  Данные машины не указаны
                </span>
              </div>
            )}
          </div>

          {/* Маршрут */}
          <div style={{
            background: '#f9fafb',
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 16,
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
            }}>
              Маршрут
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Иконки маршрута */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2, gap: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <div style={{ width: 2, height: 24, background: 'linear-gradient(180deg, #10b981, #f43f5e)', borderRadius: 1 }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e', flexShrink: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: 2 }}>Откуда</div>
                  <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.88rem' }}>{fromLocation || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: 2 }}>Куда</div>
                  <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.88rem' }}>{toLocation || '—'}</div>
                </div>
              </div>
              {tripTime && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  background: 'white', border: '1.5px solid #e5e7eb',
                  borderRadius: 12, padding: '8px 12px', alignSelf: 'center',
                }}>
                  <Clock size={14} color="#10b981" />
                  <span style={{ fontWeight: 700, color: '#1f2937', fontSize: '0.85rem' }}>{tripTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Кнопки */}
          <button className="tac-btn-chat" onClick={handleDismiss}>
            Открыть чат с водителем
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
