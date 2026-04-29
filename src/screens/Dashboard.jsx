import React, { useState } from 'react';
import { User, Car, Clock, Search, Navigation, ArrowRight, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import AddressInput from '../components/AddressInput';

export default function Dashboard({ onSearch, currentUser, onShowSettings }) {
  const { t } = useTranslation();
  const [role, setRole] = useState('passenger');
  const [from, setFrom] = useState('Жилмассив Ала-Арча');
  const [to, setTo] = useState('ЦУМ (Центр)');
  const [time, setTime] = useState('08:15');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(0); // цена за место в сомах (0 = бесплатно)
  const [geoLoading, setGeoLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const formatDateLabel = (d) => {
    if (d === today) return 'Сегодня';
    if (d === tomorrow) return 'Завтра';
    const dt = new Date(d);
    return dt.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ru`,
            { headers: { 'Accept-Language': 'ru' } }
          );
          const data = await res.json();
          const addr = data.address;
          const location =
            addr.quarter ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.road ||
            data.display_name?.split(',')[0];
          if (location) setFrom(location);
        } catch {
          // ignore
        } finally {
          setGeoLoading(false);
        }
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({
      role,
      from, to, time, date,
      seats: role === 'driver' ? seats : 1,
      price: role === 'driver' ? price : 0,
    });
  };

  return (
    <div className="dashboard screen-content">
      {/* Сегментированный контрол роли */}
      <div className="role-segment-wrap">
        <p className="role-segment-label">Я еду как</p>
        <div className="role-segment">
          <button
            type="button"
            className={`role-seg-btn ${role === 'passenger' ? 'seg-active seg-passenger' : ''}`}
            onClick={() => setRole('passenger')}
          >
            <User size={16} />
            <span>{t('matches.passenger')}</span>
          </button>
          <button
            type="button"
            className={`role-seg-btn ${role === 'driver' ? 'seg-active seg-driver' : ''}`}
            onClick={() => setRole('driver')}
          >
            <Car size={16} />
            <span>{t('matches.driver')}</span>
          </button>
        </div>
      </div>

      {/* Предупреждение: водитель без данных машины */}
      {role === 'driver' && currentUser && !currentUser.car_model && (
        <div
          onClick={onShowSettings}
          style={{
            background: '#fffbeb',
            border: '1.5px solid #fcd34d',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
          onMouseLeave={e => e.currentTarget.style.background = '#fffbeb'}
        >
          <span style={{ fontSize: '1.5rem' }}>🚗</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#92400e' }}>Данные машины не заполнены</div>
            <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: 2 }}>Пассажиры не увидят вашу машину. Нажмите чтобы заполнить →</div>
          </div>
        </div>
      )}

      {/* Мини-карта */}
      <div className="mini-map-wrap">
        <RealMap showUserOnly={true} height="140px" />
      </div>

      {/* Форма поиска */}
      <form className="trip-form glass-panel" onSubmit={handleSubmit}>
        <h3 className="form-title">
          {role === 'driver' ? '🚗 Куда едете?' : '🗺️ Ваш маршрут'}
        </h3>

        {/* Route block */}
        <div className="route-block">
          <div className="route-row">
            <div className="dot green" />
            <div className="route-field">
              <AddressInput
                value={from}
                onChange={setFrom}
                placeholder={`${t('search.from')}...`}
                iconColor="#10b981"
                name="from"
              />
            </div>
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              title="Определить моё местоположение"
              className="geo-btn"
            >
              <Navigation size={16} style={{ animation: geoLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          <div className="route-divider-line" />
          <div className="route-row">
            <div className="dot red" />
            <div className="route-field">
              <AddressInput
                value={to}
                onChange={setTo}
                placeholder={`${t('search.to')}...`}
                iconColor="#f43f5e"
                name="to"
              />
            </div>
          </div>
        </div>

        {/* Дата + Время */}
        <div className="datetime-block">
          <div className="time-row" style={{ marginBottom: 0, borderRadius: '10px 10px 0 0', borderBottom: '1px solid #e5e7eb' }}>
            <Calendar size={16} color="#6366f1" />
            <span className="time-label">Дата поездки</span>
            <div className="date-picker-wrap">
              <span className="date-label-text">{formatDateLabel(date)}</span>
              <input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                onClick={e => e.target.showPicker && e.target.showPicker()}
                className="date-input-hidden"
              />
            </div>
          </div>
          <div className="time-row" style={{ borderRadius: '0 0 10px 10px', marginBottom: 0 }}>
            <Clock size={16} color="#10b981" />
            <span className="time-label">Время отправления</span>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              className="time-input"
            />
          </div>
        </div>

        {/* Количество мест (только для водителя) */}
        {role === 'driver' && (
          <div className="seats-row">
            <span className="seats-label">🪑 Свободных мест</span>
            <div className="seats-btns">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`seat-btn ${seats === n ? 'active' : ''}`}
                  onClick={() => setSeats(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Цена за место (только для водителя) */}
        {role === 'driver' && (
          <div className="seats-row" style={{ marginBottom: '1.2rem' }}>
            <span className="seats-label">💰 Стоимость места</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min="0"
                max="9999"
                step="50"
                value={price || ''}
                onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                style={{
                  width: 80,
                  padding: '6px 10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 10,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#111827',
                  textAlign: 'right',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280' }}>сом</span>
              {price === 0 && (
                <span style={{ fontSize: '0.73rem', color: '#9ca3af' }}>бесплатно</span>
              )}
            </div>
          </div>
        )}

        <button type="submit" className="primary-btn search-btn">
          <Search size={18} />
          <span>{role === 'driver' ? 'Найти пассажиров' : 'Найти водителя'}</span>
          <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
        </button>
      </form>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        /* Role segment */
        .role-segment-wrap {
          background: white;
          border-radius: 18px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
        }
        .role-segment-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 10px;
        }
        .role-segment {
          display: flex;
          background: #f1f5f9;
          border-radius: 14px;
          padding: 4px;
          gap: 4px;
        }
        .role-seg-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 11px 10px;
          border: none;
          border-radius: 11px;
          background: transparent;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s ease;
          letter-spacing: 0.1px;
        }
        .role-seg-btn:hover { background: rgba(255,255,255,0.7); }
        .seg-active {
          background: white !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .seg-passenger.seg-active { color: #059669; }
        .seg-driver.seg-active { color: #d97706; }

        /* Map */
        .mini-map-wrap {
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }

        /* Form */
        .trip-form {
          border-radius: 18px;
          padding: 1.2rem;
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
          border: 1px solid #f1f5f9;
        }
        .form-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1rem;
          letter-spacing: 0.1px;
        }

        /* Route block */
        .route-block {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 0.9rem;
        }
        .route-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 14px;
        }
        .dot {
          width: 9px; height: 9px;
          border-radius: 50%; flex-shrink: 0;
        }
        .dot.green { background: #10b981; }
        .dot.red { background: #f43f5e; }
        .route-field { flex: 1; }
        .route-divider-line { height: 1px; background: #e2e8f0; margin: 0 14px; }
        .geo-btn {
          width: 32px; height: 32px; flex-shrink: 0;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #10b981;
          transition: all 0.2s;
        }
        .geo-btn:hover:not(:disabled) { background: #f0fdf4; border-color: #10b981; }
        .geo-btn:disabled { color: #9ca3af; cursor: wait; }

        /* DateTime */
        .datetime-block {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 1rem;
          background: #f8fafc;
        }
        .time-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: none;
          background: transparent;
        }
        .time-label { flex: 1; font-size: 0.83rem; font-weight: 500; color: #64748b; }
        .time-input {
          border: none;
          background: transparent;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          cursor: pointer;
        }
        .date-picker-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .date-label-text {
          font-size: 0.95rem;
          font-weight: 700;
          color: #6366f1;
          cursor: pointer;
          padding: 2px 8px;
          border-radius: 8px;
          transition: background 0.15s;
        }
        .date-label-text:hover { background: #ede9fe; }
        .date-input-hidden {
          position: absolute;
          width: 100%; height: 100%;
          opacity: 0; cursor: pointer;
          top: 0; left: 0;
          border: none; background: none;
        }

        .search-btn {
          display: flex !important;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #10b981, #059669) !important;
          box-shadow: 0 4px 20px rgba(16,185,129,0.3) !important;
          font-size: 0.93rem;
          font-weight: 700;
          letter-spacing: 0.2px;
          margin-top: 0;
          border-radius: 14px !important;
        }
        .search-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(16,185,129,0.4) !important;
        }

        /* Seats selector */
        .seats-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 1rem;
        }
        .seats-label { font-size: 0.85rem; font-weight: 500; color: #64748b; }
        .seats-btns { display: flex; gap: 6px; }
        .seat-btn {
          width: 36px; height: 36px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          font-size: 0.9rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.18s;
        }
        .seat-btn:hover { border-color: #10b981; color: #10b981; }
        .seat-btn.active {
          border-color: #10b981;
          background: #10b981;
          color: white;
          box-shadow: 0 2px 8px rgba(16,185,129,0.3);
        }
      `}</style>
    </div>
  );
}
