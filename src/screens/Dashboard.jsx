import React, { useState } from 'react';
import { localDateStr } from '../utils/date';
import { User, Car, Clock, Search, Navigation, ArrowRight, Calendar, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import AddressInput from '../components/AddressInput';

// Популярные жилые комплексы, микрорайоны и ориентиры Бишкека и Чуйской области
const BISHKEK_HUBS = [
  { name: 'ЦУМ (Центр)', cat: 'center' },
  { name: 'ТРК Asia Mall', cat: 'center' },
  { name: 'Южная Магистраль', cat: 'center' },
  { name: 'мкр. Асанбай', cat: 'districts' },
  { name: 'мкр. Джал', cat: 'districts' },
  { name: 'мкр. Тунгуч', cat: 'districts' },
  { name: 'мкр. Восток-5', cat: 'districts' },
  { name: 'ЖК «Ала-Арча»', cat: 'districts' },
  { name: 'ж/м Ак-Өргө', cat: 'districts' },
  { name: 'Рынок Дордой', cat: 'markets' },
  { name: 'Ошский базар', cat: 'markets' },
  { name: 'Аламединский базар', cat: 'markets' },
  { name: 'Кудайберген', cat: 'markets' },
  { name: 'Аэропорт Манас', cat: 'chuy' },
  { name: 'г. Кант', cat: 'chuy' },
  { name: 'г. Токмок', cat: 'chuy' },
  { name: 'с. Сокулук', cat: 'chuy' },
  { name: 'г. Кара-Балта', cat: 'chuy' },
  { name: 'Политех / БГУ', cat: 'center' },
];

const HUB_CATEGORIES = [
  { id: 'all', label: '⚡ Все' },
  { id: 'center', label: '🏙️ Центр' },
  { id: 'districts', label: '🏘️ Районы' },
  { id: 'markets', label: '🛒 Базары' },
  { id: 'chuy', label: '🚗 Пригород' },
];

export default function Dashboard({ onSearch, currentUser, onShowSettings }) {
  const { t } = useTranslation();
  const [role, setRole] = useState('passenger');
  const [from, setFrom] = useState('Жилмассив Ала-Арча');
  const [to, setTo] = useState('ЦУМ (Центр)');
  const [tagTarget, setTagTarget] = useState('to'); // 'from' или 'to'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [time, setTime] = useState('08:15');
  const [date, setDate] = useState(localDateStr());
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(0); // цена за место в сомах (0 = бесплатно)
  const [geoLoading, setGeoLoading] = useState(false);
  const [errors, setErrors] = useState({}); // валидационные ошибки формы

  const today = localDateStr();
  const tomorrow = localDateStr(1);

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

  const handleTagClick = (placeName) => {
    if ('vibrate' in navigator) navigator.vibrate?.(10);
    if (tagTarget === 'from') {
      setFrom(placeName);
      setErrors(prev => ({ ...prev, from: undefined }));
    } else {
      setTo(placeName);
      setErrors(prev => ({ ...prev, to: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Валидация: поля "Откуда" и "Куда" не должны быть пустыми
    const newErrors = {};
    if (!from.trim()) newErrors.from = 'Укажите откуда';
    if (!to.trim()) newErrors.to = 'Укажите куда';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    onSearch({
      role,
      from: from.trim(),
      to: to.trim(),
      time,
      date,
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
            onClick={() => {
              if ('vibrate' in navigator) navigator.vibrate?.(10);
              setRole('passenger');
            }}
          >
            <User size={16} />
            <span>{t('matches.passenger')}</span>
          </button>
          <button
            type="button"
            className={`role-seg-btn ${role === 'driver' ? 'seg-active seg-driver' : ''}`}
            onClick={() => {
              if ('vibrate' in navigator) navigator.vibrate?.(10);
              setRole('driver');
            }}
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
                onChange={(v) => { setFrom(v); setErrors(prev => ({ ...prev, from: undefined })); }}
                placeholder={`${t('search.from')}...`}
                iconColor={errors.from ? '#ef4444' : '#10b981'}
                name="from"
              />
              {errors.from && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '3px 0 0 2px' }}>
                  {errors.from}
                </p>
              )}
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
                onChange={(v) => { setTo(v); setErrors(prev => ({ ...prev, to: undefined })); }}
                placeholder={`${t('search.to')}...`}
                iconColor={errors.to ? '#ef4444' : '#f43f5e'}
                name="to"
              />
              {errors.to && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '3px 0 0 2px' }}>
                  {errors.to}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Быстрые теги (ЖК и микрорайоны Бишкека и Чуйской области) */}
        <div className="quick-tags-wrap">
          <div className="quick-tags-header">
            <span className="quick-tags-title">📍 {t('tags.title')}</span>
            <div className="quick-tags-toggle">
              <button
                type="button"
                className={`tag-target-btn ${tagTarget === 'from' ? 'active' : ''}`}
                onClick={() => setTagTarget('from')}
              >
                {t('tags.target_from')}
              </button>
              <button
                type="button"
                className={`tag-target-btn ${tagTarget === 'to' ? 'active' : ''}`}
                onClick={() => setTagTarget('to')}
              >
                {t('tags.target_to')}
              </button>
            </div>
          </div>

          {/* Фильтр категорий локаций */}
          <div className="quick-cat-tabs">
            {HUB_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`quick-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => {
                  if ('vibrate' in navigator) navigator.vibrate?.(10);
                  setSelectedCategory(cat.id);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="quick-tags-list">
            {BISHKEK_HUBS.filter(h => selectedCategory === 'all' || h.cat === selectedCategory).map((hub) => (
              <button
                key={hub.name}
                type="button"
                className={`quick-tag-chip ${
                  (tagTarget === 'from' ? from === hub.name : to === hub.name) ? 'selected' : ''
                }`}
                onClick={() => handleTagClick(hub.name)}
              >
                {hub.name}
              </button>
            ))}
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
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 18px;
          padding: 14px 16px;
          box-shadow: var(--card-shadow);
          transition: background-color 0.25s, border-color 0.25s;
        }
        .role-segment-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-subtle);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 10px;
        }
        .role-segment {
          display: flex;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
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
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s ease;
          letter-spacing: 0.1px;
        }
        .role-seg-btn:hover { background: var(--border-subtle); }
        .seg-active {
          background: var(--bg-card) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .seg-passenger.seg-active { color: #10b981; }
        .seg-driver.seg-active { color: #f59e0b; }

        /* Map */
        .mini-map-wrap {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          box-shadow: var(--card-shadow);
        }

        /* Form */
        .trip-form {
          border-radius: 18px;
          padding: 1.25rem;
          background: var(--bg-card);
          box-shadow: var(--card-shadow);
          border: 1px solid var(--border-subtle);
          transition: background-color 0.25s, border-color 0.25s;
        }
        .form-title {
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 1rem;
          letter-spacing: 0.1px;
        }

        /* Route block */
        .route-block {
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
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
        .route-divider-line { height: 1px; background: var(--border-subtle); margin: 0 14px; }
        .geo-btn {
          width: 32px; height: 32px; flex-shrink: 0;
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #10b981;
          transition: all 0.2s;
        }
        .geo-btn:hover:not(:disabled) { background: var(--border-subtle); border-color: #10b981; }
        .geo-btn:disabled { color: var(--text-subtle); cursor: wait; }

        /* DateTime */
        .datetime-block {
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 1rem;
          background: var(--bg-subtle);
        }
        .time-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: none;
          background: transparent;
        }
        .time-label { flex: 1; font-size: 0.83rem; font-weight: 500; color: var(--text-muted); }
        .time-input {
          border: none;
          background: transparent;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
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
        .date-label-text:hover { background: rgba(99, 102, 241, 0.15); }
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
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.2px;
          margin-top: 0;
          border-radius: 14px !important;
        }
        .search-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 8px 24px rgba(16,185,129,0.42) !important;
        }

        /* Seats selector */
        .seats-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 1rem;
        }
        .seats-label { font-size: 0.85rem; font-weight: 500; color: var(--text-muted); }
        .seats-btns { display: flex; gap: 6px; }
        .seat-btn {
          width: 36px; height: 36px;
          border: 1.5px solid var(--border-subtle);
          border-radius: 10px;
          background: var(--bg-card);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-muted);
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

        /* Quick Tags (Bishkek & Chuy) */
        .quick-tags-wrap {
          margin-bottom: 0.95rem;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 11px 13px;
        }
        .quick-tags-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .quick-tags-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .quick-tags-toggle {
          display: flex;
          background: var(--border-subtle);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
        }
        .tag-target-btn {
          border: none;
          background: transparent;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          padding: 3px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tag-target-btn.active {
          background: var(--bg-card);
          color: var(--text-main);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .quick-cat-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          margin-bottom: 10px;
          padding-bottom: 2px;
          scrollbar-width: none;
        }
        .quick-cat-tabs::-webkit-scrollbar { display: none; }
        .quick-cat-btn {
          white-space: nowrap;
          border: 1px solid var(--border-subtle);
          background: var(--bg-card);
          color: var(--text-muted);
          font-size: 0.73rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.18s;
          flex-shrink: 0;
        }
        .quick-cat-btn.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.28);
        }
        .quick-tags-list {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
        }
        .quick-tags-list::-webkit-scrollbar {
          height: 4px;
        }
        .quick-tags-list::-webkit-scrollbar-thumb {
          background: var(--border-strong);
          border-radius: 4px;
        }
        .quick-tag-chip {
          white-space: nowrap;
          border: 1px solid var(--border-subtle);
          background: var(--bg-card);
          color: var(--text-main);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 5px 11px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.18s;
          flex-shrink: 0;
        }
        .quick-tag-chip:hover {
          border-color: #10b981;
          color: #10b981;
          background: var(--bg-subtle);
        }
        .quick-tag-chip.selected {
          border-color: #10b981;
          background: #10b981;
          color: white;
          box-shadow: 0 2px 8px rgba(16,185,129,0.3);
        }
      `}</style>
    </div>
  );
}
