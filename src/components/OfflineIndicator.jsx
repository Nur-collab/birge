import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * OfflineIndicator — показывает toast-баннер когда пропадает интернет.
 * Слушает браузерные события `online` / `offline`.
 * Появляется снизу над навигацией с плавной анимацией.
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Показываем "Снова в сети" на 2 сек, затем скрываем
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        role="alert"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 108,          // над навигационной панелью (88px) + зазор
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 20px',
          borderRadius: 50,
          background: isOnline
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : '#1f2937',
          color: '#fff',
          fontSize: '0.88rem',
          fontWeight: 600,
          boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
          whiteSpace: 'nowrap',
          animation: 'slideUp 0.3s ease',
          fontFamily: 'inherit',
        }}
      >
        {isOnline ? (
          <>
            <span>✅</span>
            <span>Соединение восстановлено</span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>Нет интернета</span>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}
