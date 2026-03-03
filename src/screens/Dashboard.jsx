import React, { useState } from 'react';
import { User, Car, Clock, Search, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import AddressInput from '../components/AddressInput';

export default function Dashboard({ onSearch, currentUser }) {
  const { t } = useTranslation();
  const [role, setRole] = useState('passenger');
  const [from, setFrom] = useState('Жилмассив Ала-Арча');
  const [to, setTo] = useState('ЦУМ (Центр)');
  const [time, setTime] = useState('08:15');
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
          // Извлекаем название района/микрорайона для короткого отображения
          const addr = data.address;
          const location =
            addr.quarter ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.road ||
            data.display_name?.split(',')[0];
          if (location) setFrom(location);
        } catch (e) {
          console.error('Nominatim error:', e);
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
    onSearch({ role, from, to, time });
  };

  return (
    <div className="dashboard screen-content">
      <div className="role-selector glass-panel">
        <button
          className={`role-btn ${role === 'passenger' ? 'active' : ''}`}
          onClick={() => setRole('passenger')}
        >
          <User size={20} />
          <span>{t('matches.passenger')}</span>
        </button>
        <button
          className={`role-btn driver ${role === 'driver' ? 'active' : ''}`}
          onClick={() => setRole('driver')}
        >
          <Car size={20} />
          <span>{t('matches.driver')}</span>
        </button>
      </div>
      <div className="dashboard-map-container" style={{ marginBottom: '16px', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <RealMap showUserOnly={true} height="150px" />
      </div>

      <form className="trip-form glass-panel" onSubmit={handleSubmit}>
        <h3>{t('dash.where_to')}</h3>

        <div className="input-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AddressInput
            value={from}
            onChange={setFrom}
            placeholder={`${t('search.from')}...`}
            iconColor="#10b981"
            name="from"
          />
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            title="Определить моё местоположение"
            style={{
              width: 44, height: 44, flexShrink: 0,
              border: '1px solid #d1d5db',
              borderRadius: 8, background: geoLoading ? '#f3f4f6' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: geoLoading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              color: geoLoading ? '#9ca3af' : 'var(--primary)',
            }}
          >
            <Navigation size={18} style={{ animation: geoLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        <div className="input-group">
          <AddressInput
            value={to}
            onChange={setTo}
            placeholder={`${t('search.to')}...`}
            iconColor="#f44336"
            name="to"
          />
        </div>

        <div className="input-group">
          <Clock size={18} className="input-icon" />
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="primary-btn search-btn">
          <Search size={20} />
          <span>{role === 'driver' ? t('dash.find_ride') : t('dash.find_ride')}</span>
        </button>
      </form>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          animation: fadeIn 0.4s ease-out;
        }
        .role-selector {
          display: flex;
          padding: 8px;
          gap: 8px;
        }
        .role-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 1rem 0;
          border: 2px solid transparent;
          border-radius: calc(var(--radius) - 4px);
          background: var(--light);
          color: #6b7280;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .role-btn span {
          font-size: 0.9rem;
        }
        .role-btn:hover {
          background: #e5e7eb;
        }
        .role-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
          transform: translateY(-2px);
        }
        .role-btn.driver.active {
          background: var(--secondary);
          border-color: var(--secondary);
          box-shadow: 0 4px 12px rgba(139, 195, 74, 0.3);
        }
        .trip-form h3 {
          margin-bottom: 1.2rem;
          color: var(--dark);
          text-align: center;
        }
        .input-group {
          position: relative;
          margin-bottom: 1rem;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .input-icon.from { color: var(--primary); }
        .input-icon.to { color: #f44336; }
        .input-group input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-group input:focus {
          border-color: var(--primary);
        }
        .primary-btn {
          width: 100%;
          background: var(--primary);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 1.5rem;
          transition: transform 0.1s, box-shadow 0.2s;
        }
        .primary-btn:active {
          transform: scale(0.98);
        }
        .primary-btn.search-btn {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
