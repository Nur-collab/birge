import React, { useEffect, useState } from 'react';

/**
 * ColdStartSplash — показывается пока бэкенд на Render просыпается.
 * Прогресс-бар рассчитан на ~60 секунд (20 попыток × 3 сек).
 * Сообщения меняются, чтобы пользователь не думал что приложение зависло.
 *
 * Props:
 *  attempt  {number}  — текущая попытка (1-based), для прогресс-бара
 *  maxAttempts {number} — максимум попыток
 */
export default function ColdStartSplash({ attempt = 1, maxAttempts = 20 }) {
  const progress = Math.min((attempt / maxAttempts) * 100, 95); // не доходим до 100% пока не готово
  const [dots, setDots] = useState('');

  // Анимация точек
  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Сообщения меняются по мере ожидания
  const getMessage = () => {
    if (attempt <= 3)  return 'Подключаемся к серверу';
    if (attempt <= 8)  return 'Сервер просыпается, почти готово';
    if (attempt <= 14) return 'Ещё чуть-чуть, бесплатный план греется';
    return 'Уже скоро, спасибо за терпение';
  };

  const getTip = () => {
    const tips = [
      '🚗 Birge — совместные поездки по Бишкеку',
      '💚 Экономьте до 60% на дороге вместе',
      '⭐ Рейтинг доверия защитит вас в пути',
      '📅 Планируйте поездки заранее',
      '💬 Чат с водителем прямо в приложении',
    ];
    return tips[attempt % tips.length];
  };

  return (
    <div style={styles.overlay}>
      {/* Фоновые блобы */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        {/* Логотип */}
        <div style={styles.logoWrap}>
          <div style={styles.logoRing}>
            <span style={styles.logoEmoji}>🚗</span>
          </div>
          <div style={styles.ripple} />
          <div style={{ ...styles.ripple, animationDelay: '0.6s', opacity: 0.5 }} />
        </div>

        <h1 style={styles.title}>Birge</h1>
        <p style={styles.subtitle}>Попутчики по Бишкеку</p>

        {/* Статус */}
        <div style={styles.statusBox}>
          <span style={styles.statusDot} />
          <span style={styles.statusText}>
            {getMessage()}{dots}
          </span>
        </div>

        {/* Прогресс-бар */}
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
              transition: 'width 2.8s ease-out',
            }}
          />
        </div>

        <p style={styles.hint}>
          Сервер на бесплатном хостинге (Render) засыпает после простоя.<br />
          Первый запуск занимает <strong>30–60 сек</strong> — это нормально.
        </p>

        {/* Подсказка снизу */}
        <div style={styles.tipBox}>
          <span style={styles.tipText}>{getTip()}</span>
        </div>
      </div>

      <style>{`
        @keyframes birge-pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes birge-logo-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes birge-bar-shimmer {
          0%   { background-position: -300px 0; }
          100% { background-position: 300px 0; }
        }
        @keyframes birge-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes birge-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #e8f5e9 0%, #f0fdf4 40%, #ecfdf5 70%, #e0f2fe 100%)',
    zIndex: 9999,
    padding: '1rem',
  },

  blob1: {
    position: 'absolute',
    top: '-10%',
    right: '-5%',
    width: 320,
    height: 320,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  blob2: {
    position: 'absolute',
    bottom: '-5%',
    left: '-5%',
    width: 260,
    height: 260,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(110,231,183,0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  card: {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: 28,
    padding: '2.5rem 2rem 2rem',
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.1rem',
    boxShadow: '0 20px 60px rgba(16,185,129,0.15), 0 4px 20px rgba(0,0,0,0.06)',
    animation: 'birge-fade-in 0.5s ease-out',
  },

  logoWrap: {
    position: 'relative',
    width: 88,
    height: 88,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoRing: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
    animation: 'birge-logo-float 3s ease-in-out infinite',
    position: 'relative',
    zIndex: 1,
  },

  logoEmoji: {
    fontSize: '2.2rem',
    lineHeight: 1,
  },

  ripple: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px solid rgba(16,185,129,0.5)',
    animation: 'birge-pulse-ring 2s ease-out infinite',
  },

  title: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#111827',
    letterSpacing: '-0.5px',
    margin: 0,
  },

  subtitle: {
    fontSize: '0.9rem',
    color: '#6b7280',
    fontWeight: 500,
    margin: '-0.5rem 0 0',
  },

  statusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 50,
    padding: '8px 18px',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#10b981',
    flexShrink: 0,
    animation: 'birge-dot-pulse 1.2s ease-in-out infinite',
  },

  statusText: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#065f46',
    whiteSpace: 'nowrap',
  },

  progressTrack: {
    width: '100%',
    height: 6,
    background: '#e5e7eb',
    borderRadius: 99,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 99,
    background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)',
    backgroundSize: '300px 100%',
    animation: 'birge-bar-shimmer 2s linear infinite',
  },

  hint: {
    fontSize: '0.78rem',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.6,
    margin: 0,
  },

  tipBox: {
    background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
    border: '1px solid #d1fae5',
    borderRadius: 12,
    padding: '10px 16px',
    width: '100%',
    textAlign: 'center',
  },

  tipText: {
    fontSize: '0.82rem',
    color: '#059669',
    fontWeight: 500,
  },
};
