import React, { useState } from 'react';
import { localDateStr } from '../utils/date';
import { 
  User, 
  Car, 
  Clock, 
  Search, 
  Navigation, 
  ArrowRight, 
  ArrowUpDown,
  Calendar, 
  MapPin, 
  Layers, 
  Building2, 
  Compass, 
  ShoppingBag, 
  AlertTriangle,
  Users,
  CreditCard,
  Plus,
  Minus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import AddressInput from '../components/AddressInput';

// Популярные жилые комплексы, микрорайоны и ориентиры Бишкека и Чуйской области
const BISHKEK_HUBS = [
  { name: 'ЦУМ (Центр)', cat: 'center' },
  { name: 'ТРК Asia Mall', cat: 'center' },
  { name: 'Южная Магистраль', cat: 'center' },
  { name: 'Политех / БГУ', cat: 'center' },
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
];

const HUB_CATEGORIES = [
  { id: 'all', label: 'Все', icon: Layers },
  { id: 'center', label: 'Центр', icon: Building2 },
  { id: 'districts', label: 'Районы', icon: Compass },
  { id: 'markets', label: 'Рынки', icon: ShoppingBag },
  { id: 'chuy', label: 'Пригород', icon: Navigation },
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
  const [price, setPrice] = useState(100); // цена за место в сомах
  const [geoLoading, setGeoLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

  const handleSwapAddresses = () => {
    if ('vibrate' in navigator) navigator.vibrate?.(10);
    setFrom(to);
    setTo(from);
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
    const newErrors = {};
    if (!from.trim()) newErrors.from = 'Укажите точку отправления';
    if (!to.trim()) newErrors.to = 'Укажите точку назначения';
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
      {/* Селектор роли (iOS / Linear Segmented Pill) */}
      <div className="role-switch-container">
        <div className="role-switch">
          <button
            type="button"
            className={`role-option ${role === 'passenger' ? 'active' : ''}`}
            onClick={() => {
              if ('vibrate' in navigator) navigator.vibrate?.(10);
              setRole('passenger');
            }}
          >
            <User size={16} />
            <span>Пассажир</span>
          </button>
          <button
            type="button"
            className={`role-option ${role === 'driver' ? 'active' : ''}`}
            onClick={() => {
              if ('vibrate' in navigator) navigator.vibrate?.(10);
              setRole('driver');
            }}
          >
            <Car size={16} />
            <span>Водитель</span>
          </button>
        </div>
      </div>

      {/* Предупреждение: водитель без данных машины */}
      {role === 'driver' && currentUser && !currentUser.car_model && (
        <div className="driver-warning-card" onClick={onShowSettings}>
          <div className="warning-icon-wrap">
            <AlertTriangle size={18} />
          </div>
          <div className="warning-content">
            <div className="warning-title">Данные автомобиля не указаны</div>
            <div className="warning-desc">Пассажиры не увидят марку и номер машины</div>
          </div>
          <ArrowRight size={16} className="warning-arrow" />
        </div>
      )}

      {/* Интерактивная карта маршрута */}
      <div className="map-card">
        <RealMap showUserOnly={true} height="130px" />
      </div>

      {/* Основная карточка маршрута */}
      <form className="route-form-card" onSubmit={handleSubmit}>
        <div className="form-header">
          <div className="form-header-title">
            <MapPin size={16} className="text-primary" />
            <span>{role === 'driver' ? 'Маршрут поездки' : 'Поиск попутчиков'}</span>
          </div>
          <button
            type="button"
            className="swap-route-btn"
            onClick={handleSwapAddresses}
            title="Поменять местами"
          >
            <ArrowUpDown size={15} />
          </button>
        </div>

        {/* Интегрированный трек маршрута */}
        <div className="connected-route-card">
          <div className="route-track-indicator">
            <div className="track-node origin-node" />
            <div className="track-line" />
            <div className="track-node dest-node" />
          </div>

          <div className="route-inputs-col">
            <div className="route-input-cell">
              <AddressInput
                value={from}
                onChange={(v) => { setFrom(v); setErrors(prev => ({ ...prev, from: undefined })); }}
                placeholder="Откуда едем..."
                iconColor={errors.from ? '#ef4444' : '#10b981'}
                name="from"
              />
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={geoLoading}
                title="Определить мое местоположение"
                className="inline-geo-btn"
              >
                <Navigation size={15} className={geoLoading ? 'spin' : ''} />
              </button>
            </div>
            {errors.from && <p className="input-err-msg">{errors.from}</p>}

            <div className="route-input-cell">
              <AddressInput
                value={to}
                onChange={(v) => { setTo(v); setErrors(prev => ({ ...prev, to: undefined })); }}
                placeholder="Куда направляемся..."
                iconColor={errors.to ? '#ef4444' : '#64748b'}
                name="to"
              />
            </div>
            {errors.to && <p className="input-err-msg">{errors.to}</p>}
          </div>
        </div>

        {/* Быстрые хабы Бишкека и Чуйской области */}
        <div className="hubs-section">
          <div className="hubs-top">
            <div className="section-label">Популярные точки</div>
            <div className="target-toggle">
              <button
                type="button"
                className={`target-pill ${tagTarget === 'from' ? 'active' : ''}`}
                onClick={() => setTagTarget('from')}
              >
                Откуда
              </button>
              <button
                type="button"
                className={`target-pill ${tagTarget === 'to' ? 'active' : ''}`}
                onClick={() => setTagTarget('to')}
              >
                Куда
              </button>
            </div>
          </div>

          {/* Категории */}
          <div className="category-scroll">
            {HUB_CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => {
                    if ('vibrate' in navigator) navigator.vibrate?.(10);
                    setSelectedCategory(cat.id);
                  }}
                >
                  <IconComp size={13} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Список хабов */}
          <div className="hubs-chips-scroll">
            {BISHKEK_HUBS.filter(h => selectedCategory === 'all' || h.cat === selectedCategory).map((hub) => {
              const isSelected = tagTarget === 'from' ? from === hub.name : to === hub.name;
              return (
                <button
                  key={hub.name}
                  type="button"
                  className={`hub-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleTagClick(hub.name)}
                >
                  {hub.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Дата и Время */}
        <div className="datetime-grid">
          <div className="datetime-cell">
            <div className="cell-label">
              <Calendar size={14} className="text-muted" />
              <span>Дата</span>
            </div>
            <div className="date-picker-box">
              <span className="date-display">{formatDateLabel(date)}</span>
              <input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                onClick={e => e.target.showPicker && e.target.showPicker()}
                className="hidden-native-input"
              />
            </div>
          </div>

          <div className="datetime-cell">
            <div className="cell-label">
              <Clock size={14} className="text-muted" />
              <span>Время</span>
            </div>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              className="time-native-input"
            />
          </div>
        </div>

        {/* Настройки для водителя: Места и Цена */}
        {role === 'driver' && (
          <div className="driver-parameters-card">
            {/* Места */}
            <div className="parameter-row">
              <div className="param-label-group">
                <Users size={16} className="text-muted" />
                <span className="param-title">Свободных мест</span>
              </div>
              <div className="stepper-box">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setSeats(s => Math.max(1, s - 1))}
                  disabled={seats <= 1}
                >
                  <Minus size={14} />
                </button>
                <span className="stepper-value">{seats}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setSeats(s => Math.min(8, s + 1))}
                  disabled={seats >= 8}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Цена за место */}
            <div className="parameter-row">
              <div className="param-label-group">
                <CreditCard size={16} className="text-muted" />
                <span className="param-title">Взнос за место</span>
              </div>
              <div className="price-input-wrap">
                <input
                  type="number"
                  min="0"
                  max="9999"
                  step="50"
                  value={price || ''}
                  onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="price-number-input"
                />
                <span className="currency-label">СОМ</span>
              </div>
            </div>
          </div>
        )}

        <button type="submit" className="primary-btn submit-action-btn">
          <Search size={18} />
          <span>{role === 'driver' ? 'Найти пассажиров по пути' : 'Найти подходящего водителя'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        /* Role Switcher */
        .role-switch-container {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 5px;
          box-shadow: var(--card-shadow);
        }
        .role-switch {
          display: flex;
          background: var(--bg-subtle);
          border-radius: 10px;
          padding: 3px;
          gap: 4px;
        }
        .role-option {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .role-option:hover {
          color: var(--text-main);
        }
        .role-option.active {
          background: var(--bg-card);
          color: var(--primary);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }

        /* Driver Warning */
        .driver-warning-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .driver-warning-card:hover {
          background: rgba(245, 158, 11, 0.12);
        }
        .warning-icon-wrap {
          color: #f59e0b;
          display: flex;
          align-items: center;
        }
        .warning-content {
          flex: 1;
        }
        .warning-title {
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .warning-desc {
          font-size: 0.74rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .warning-arrow {
          color: var(--text-subtle);
        }

        /* Map */
        .map-card {
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          box-shadow: var(--card-shadow);
        }

        /* Form */
        .route-form-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          box-shadow: var(--card-shadow);
        }
        .form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .form-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .swap-route-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .swap-route-btn:hover {
          background: var(--border-subtle);
          color: var(--text-main);
        }

        /* Connected Route */
        .connected-route-card {
          display: flex;
          align-items: stretch;
          gap: 12px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          margin-bottom: 1rem;
        }
        .route-track-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          width: 14px;
          flex-shrink: 0;
        }
        .track-node {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid var(--bg-subtle);
        }
        .origin-node {
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
        }
        .dest-node {
          background: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
        }
        .track-line {
          width: 2px;
          flex: 1;
          background: var(--border-strong);
          margin: 4px 0;
        }
        .route-inputs-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .route-input-cell {
          display: flex;
          align-items: center;
          position: relative;
        }
        .route-input-cell > div {
          flex: 1;
        }
        .inline-geo-btn {
          width: 32px;
          height: 32px;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--bg-card);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-left: 6px;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .inline-geo-btn:hover {
          background: var(--border-subtle);
        }
        .inline-geo-btn:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .input-err-msg {
          font-size: 0.72rem;
          color: #ef4444;
          margin: 0;
          padding-left: 2px;
        }

        /* Hubs */
        .hubs-section {
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px;
          margin-bottom: 1rem;
        }
        .hubs-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .target-toggle {
          display: flex;
          background: var(--border-subtle);
          border-radius: 6px;
          padding: 2px;
          gap: 2px;
        }
        .target-pill {
          border: none;
          background: transparent;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .target-pill.active {
          background: var(--bg-card);
          color: var(--text-main);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .category-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          margin-bottom: 10px;
          scrollbar-width: none;
        }
        .category-scroll::-webkit-scrollbar { display: none; }
        .category-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-pill);
          background: var(--bg-card);
          color: var(--text-muted);
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.18s;
        }
        .category-pill:hover {
          color: var(--text-main);
          border-color: var(--border-strong);
        }
        .category-pill.active {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          box-shadow: 0 2px 8px var(--primary-glow);
        }
        .hubs-chips-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }
        .hub-chip {
          white-space: nowrap;
          border: 1px solid var(--border-subtle);
          background: var(--bg-card);
          color: var(--text-main);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all 0.18s;
          flex-shrink: 0;
        }
        .hub-chip:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .hub-chip.selected {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          box-shadow: 0 2px 8px var(--primary-glow);
        }

        /* DateTime */
        .datetime-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 1rem;
        }
        .datetime-cell {
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cell-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .date-picker-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .date-display {
          font-size: 0.94rem;
          font-weight: 700;
          color: var(--text-main);
          cursor: pointer;
        }
        .hidden-native-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .time-native-input {
          border: none;
          background: transparent;
          font-size: 0.94rem;
          font-weight: 700;
          color: var(--text-main);
          outline: none;
          padding: 0;
          cursor: pointer;
        }

        /* Driver parameters */
        .driver-parameters-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 1.1rem;
        }
        .parameter-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .param-label-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .param-title {
          font-size: 0.86rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .stepper-box {
          display: flex;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 2px;
        }
        .stepper-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .stepper-btn:hover:not(:disabled) {
          background: var(--bg-subtle);
        }
        .stepper-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .stepper-value {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-main);
          min-width: 28px;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .price-input-wrap {
          display: flex;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 4px 8px;
          gap: 6px;
        }
        .price-number-input {
          width: 65px;
          border: none;
          background: transparent;
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-main);
          text-align: right;
          outline: none;
          font-variant-numeric: tabular-nums;
        }
        .currency-label {
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .submit-action-btn {
          margin-top: 0.2rem;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
