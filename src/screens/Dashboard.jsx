import React, { useState } from 'react';
import { User, Car, Clock, Search, Navigation, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import AddressInput from '../components/AddressInput';

export default function Dashboard({ onSearch, currentUser }) {
  const { t } = useTranslation();
  const [role, setRole] = useState('passenger');
  const [from, setFrom] = useState('Жилмассив Ала-Арча');
  const [to, setTo] = useState('ЦУМ (Центр)');
  const [time, setTime] = useState('08:15');
  const [seats, setSeats] = useState(3);
  const [geoLoading, setGeoLoading] = useState(false);

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
    onSearch({ role, from, to, time, seats: role === 'driver' ? seats : 1 });
  };

  return (
    <div className="dashboard screen-content">
      {/* Выбор роли */}
      <div className="role-selector glass-panel">
        <p className="role-label">Я еду как</p>
        <div className="role-btns">
          <button
            type="button"
            className={`role-card ${role === 'passenger' ? 'active' : ''}`}
            onClick={() => setRole('passenger')}
          >
            <div className={`role-icon ${role === 'passenger' ? 'active-green' : ''}`}>
              <User size={22} />
            </div>
            <span className="role-name">{t('matches.passenger')}</span>
            <span className="role-desc">Ищу водителя</span>
          </button>
          <button
            type="button"
            className={`role-card driver ${role === 'driver' ? 'active driver-active' : ''}`}
            onClick={() => setRole('driver')}
          >
            <div className={`role-icon ${role === 'driver' ? 'active-amber' : 'amber-idle'}`}>
              <Car size={22} />
            </div>
            <span className="role-name">{t('matches.driver')}</span>
            <span className="role-desc">Предлагаю места</span>
          </button>
        </div>
      </div>

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

        {/* Время */}
        <div className="time-row">
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
          gap: 1rem;
        }

        /* Role selector */
        .role-selector { padding: 1rem; }
        .role-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .role-btns { display: flex; gap: 10px; }
        .role-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 14px 8px;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          background: #f9fafb;
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .role-card:hover { background: #f3f4f6; transform: translateY(-1px); }
        .role-card.active {
          border-color: #10b981;
          background: #f0fdf4;
          box-shadow: 0 4px 14px rgba(16,185,129,0.15);
          transform: translateY(-2px);
        }
        .role-card.driver-active {
          border-color: #f59e0b !important;
          background: #fffbeb !important;
          box-shadow: 0 4px 14px rgba(245,158,11,0.15) !important;
        }
        .role-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: #e5e7eb; color: #6b7280;
          transition: all 0.2s;
        }
        .role-icon.active-green { background: #10b981; color: white; }
        .role-icon.active-amber { background: #f59e0b; color: white; }
        .role-icon.amber-idle { background: #fef3c7; color: #f59e0b; }
        .role-name { font-weight: 700; font-size: 0.88rem; color: #374151; }
        .role-desc { font-size: 0.7rem; color: #9ca3af; }

        /* Map */
        .mini-map-wrap {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow);
        }

        /* Form */
        .trip-form { padding: 1.2rem; }
        .form-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--dark);
          margin-bottom: 1rem;
        }

        /* Route block */
        .route-block {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .route-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 12px;
        }
        .dot {
          width: 10px; height: 10px;
          border-radius: 50%; flex-shrink: 0;
        }
        .dot.green { background: #10b981; }
        .dot.red { background: #f43f5e; }
        .route-field { flex: 1; }
        .route-divider-line { height: 1px; background: #e5e7eb; margin: 0 12px; }
        .geo-btn {
          width: 32px; height: 32px; flex-shrink: 0;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: var(--primary);
          transition: all 0.2s;
        }
        .geo-btn:hover:not(:disabled) { background: #f0fdf4; border-color: #10b981; }
        .geo-btn:disabled { color: #9ca3af; cursor: wait; }

        /* Time */
        .time-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 1.2rem;
        }
        .time-label { flex: 1; font-size: 0.85rem; font-weight: 500; color: #6b7280; }
        .time-input {
          border: none;
          background: transparent;
          font-size: 1rem;
          font-weight: 700;
          color: var(--dark);
          outline: none;
          cursor: pointer;
        }

        .search-btn {
          display: flex !important;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #10b981, #059669) !important;
          box-shadow: 0 4px 15px rgba(16,185,129,0.35) !important;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.2px;
          margin-top: 0;
        }
        .search-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16,185,129,0.45) !important;
        }

        /* Seats selector */
        .seats-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 1.2rem;
        }
        .seats-label { font-size: 0.88rem; font-weight: 500; color: #6b7280; }
        .seats-btns { display: flex; gap: 6px; }
        .seat-btn {
          width: 36px; height: 36px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          font-size: 0.95rem;
          font-weight: 700;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.18s;
        }
        .seat-btn:hover { border-color: #10b981; color: #10b981; }
        .seat-btn.active {
          border-color: #10b981;
          background: #10b981;
          color: white;
        }
      `}</style>
    </div>
  );
}
