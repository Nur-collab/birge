import React from 'react';
import { Navigation, Trash2, RotateCcw } from 'lucide-react';

/**
 * ResumeTripBanner — всплывает снизу если у пользователя есть
 * незавершённая active-поездка (закрыл приложение во время поиска).
 *
 * Props:
 *  trip     {object}   — данные поездки из /users/me/active-trip
 *  onResume {function} — возобновить поиск
 *  onDiscard {function} — удалить и начать заново
 */
export default function ResumeTripBanner({ trip, onResume, onDiscard }) {
  if (!trip?.found) return null;

  const roleLabel = trip.role === 'driver' ? '🚗 Водитель' : '🙋 Пассажир';
  const roleColor = trip.role === 'driver' ? '#f59e0b' : '#10b981';

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Иконка */}
        <div style={{ ...styles.iconWrap, background: roleColor + '22', color: roleColor }}>
          <RotateCcw size={20} />
        </div>

        {/* Текст */}
        <div style={styles.body}>
          <div style={styles.title}>Незавершённый поиск</div>
          <div style={styles.role}>{roleLabel}</div>
          <div style={styles.route}>
            <span style={styles.routeFrom}>📍 {trip.origin}</span>
            <span style={styles.arrow}>→</span>
            <span style={styles.routeTo}>🏁 {trip.destination}</span>
          </div>
          <div style={styles.time}>🕐 {trip.time}</div>
        </div>

        {/* Кнопки */}
        <div style={styles.actions}>
          <button
            style={styles.resumeBtn}
            onClick={onResume}
            title="Возобновить поиск"
          >
            <Navigation size={15} />
            Продолжить
          </button>
          <button
            style={styles.discardBtn}
            onClick={onDiscard}
            title="Удалить и начать заново"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes birge-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'fixed',
    bottom: 82,           // над bottom-nav (70px) + отступ
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 2rem)',
    maxWidth: 444,
    zIndex: 200,
    animation: 'birge-slide-up 0.35s ease-out',
  },

  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1.5px solid #e5e7eb',
    borderRadius: 18,
    padding: '12px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(16,185,129,0.08)',
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  body: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: 2,
  },

  role: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 3,
  },

  route: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },

  routeFrom: {
    fontSize: '0.75rem',
    color: '#111827',
    fontWeight: 500,
    maxWidth: 110,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  arrow: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },

  routeTo: {
    fontSize: '0.75rem',
    color: '#111827',
    fontWeight: 500,
    maxWidth: 110,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  time: {
    fontSize: '0.73rem',
    color: '#9ca3af',
    marginTop: 2,
  },

  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
  },

  resumeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 12px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
    transition: 'opacity 0.15s',
  },

  discardBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
};
