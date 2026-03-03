import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Проверяем, установлено ли приложение
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e) => {
            // Предотвращаем автоматический показ Safari/Chrome
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBtn(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallBtn(false);
            setDeferredPrompt(null);
        }
    };

    if (!showInstallBtn || isInstalled) return null;

    return (
        <div className="install-banner glass-panel">
            <div className="install-content">
                <div className="install-icon">Б</div>
                <div className="install-text">
                    <p className="install-title">Установите БИРГЕ</p>
                    <p className="install-desc">Добавьте на главный экран для быстрого доступа</p>
                </div>
            </div>
            <div className="install-actions">
                <button className="primary-btn install-btn" onClick={handleInstallClick}>
                    <Download size={14} /> Установить
                </button>
                <button className="close-btn" onClick={() => setShowInstallBtn(false)}>
                    <X size={16} />
                </button>
            </div>

            <style>{`
        .install-banner {
          position: fixed;
          bottom: 70px; /* Над нижним меню */
          left: 15px;
          right: 15px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 12px 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 1000;
          animation: slideUp 0.3s ease-out;
          border: 1px solid rgba(255,255,255,0.4);
        }
        .install-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .install-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .install-text {
          flex: 1;
        }
        .install-title {
          margin: 0;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--dark);
        }
        .install-desc {
          margin: 0;
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.2;
          margin-top: 2px;
        }
        .install-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .install-btn {
          padding: 6px 12px;
          font-size: 0.8rem;
          border-radius: 8px;
          height: auto;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .close-btn {
          background: none;
          border: none;
          color: #9ca3af;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      `}</style>
        </div>
    );
}
