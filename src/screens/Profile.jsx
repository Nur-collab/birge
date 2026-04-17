import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Car, Settings, LogOut, ChevronRight, Loader, Clock, ShieldAlert, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

export default function Profile({ currentUser: userProp, onLogout, onShowSettings, onShowHistory }) {
  const { t } = useTranslation();
  const [user, setUser] = useState(userProp || null);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // {status, message, bot_url?}
  const fileInputRef = React.useRef(null);

  // Используем публичный ImgBB ключ для тестов (без регистрации)
  const IMGBB_API_KEY = '0a4da4d3f56ce2658fd6fbebc8e727e7';

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Загружаем на ImgBB
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const newPhotoUrl = data.data.url;
        // 2. Обновляем в нашей БД
        const updatedUser = await api.updateProfile({ photo: newPhotoUrl });
        setUser(updatedUser);

        // Показываем уведомление через браузер если возможно
        if (Notification.permission === 'granted') {
          new Notification('Birge', { body: 'Фото профиля обновлено!' });
        }
      } else {
        alert('Ошибка загрузки фото: ' + data.error?.message);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Ошибка при загрузке картинки');
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    setVerifyResult(null);
    const result = await api.verifyAccount();
    if (!result) {
      setVerifyResult({ status: 'error', message: 'Ошибка соединения. Попробуйте позже.' });
    } else {
      setVerifyResult(result);
      // Обновляем локальный стейт пользователя если верифицировали
      if (result.status === 'verified') {
        setUser(prev => prev ? { ...prev, is_verified: true } : prev);
      }
    }
    setVerifyLoading(false);
  };

  useEffect(() => {
    if (userProp) {
      setUser(userProp);
      setError(false);
    } else {
      setError(false);
      api.getCurrentUser().then(data => {
        if (data) setUser(data);
        else setError(true);
      });
    }
  }, [userProp]);

  if (!user && error) {
    return (
      <div className="profile screen-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '1rem' }}>
        <ShieldAlert size={40} color="#f43f5e" />
        <p style={{ color: '#6b7280', textAlign: 'center' }}>Бэкенд недоступен.<br />Подождите немного и повторите попытку.</p>
        <button className="primary-btn" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => {
          setError(false);
          api.getCurrentUser().then(data => { if (data) setUser(data); else setError(true); });
        }}>
          Повторить
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile screen-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader className="spin-loader" size={32} color="var(--primary)" />
        <style>{`.spin-loader { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="profile screen-content">
      <div className="profile-header glass-panel">
        <div className="avatar-container" onClick={() => fileInputRef.current?.click()}>
          {uploading ? (
            <div className="avatar-loader">
              <Loader size={24} color="white" className="spin-loader" />
            </div>
          ) : (
            <>
              <img src={user.photo} alt={user.name} className="profile-avatar" />
              <div className="avatar-overlay">
                <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>ИЗМЕНИТЬ</span>
              </div>
            </>
          )}
          {user.is_verified && (
            <div className="verified-badge" title="Верифицированный пользователь">
              <ShieldCheck size={16} color="white" />
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        <h2>{user.name}</h2>
        <p className="user-phone">{user.phone}</p>

        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-value">
              <Star size={16} fill="#f59e0b" color="#f59e0b" /> {user.trust_rating}
            </div>
            <div className="stat-label">{t('profile.rating')}</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">{(user.reviews || []).length}</div>
            <div className="stat-label">{t('profile.reviews')}</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">{user.registered_since}</div>
            <div className="stat-label">{t('profile.since')}</div>
          </div>
        </div>
      </div>

      <div className="limits-card glass-panel">
        <div className="limits-header">
          <div className="limits-title">
            <Car size={18} color="var(--primary)" />
            <span>{t('profile.trips_today')}</span>
          </div>
          <div className="limits-count">{user.trips_today} / 3</div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(user.trips_today / 3) * 100}%`, background: user.trips_today >= 3 ? '#f43f5e' : 'var(--primary)' }}
          ></div>
        </div>
        <p className="limits-hint">{t('profile.trips_hint')}</p>
      </div>

      {/* Карточка машины водителя */}
      <div className="car-card glass-panel" onClick={onShowSettings} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: user.car_model ? '1rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem', color: '#1f2937' }}>
            <Car size={18} color={user.car_model ? '#f59e0b' : '#9ca3af'} />
            Моя машина
          </div>
          {!user.car_model && (
            <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>+ Добавить →</span>
          )}
        </div>

        {user.car_model ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Иконка машины */}
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', flexShrink: 0,
            }}>🚗</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937' }}>{user.car_model}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                {user.car_color && (
                  <span style={{
                    background: '#f0fdf4', color: '#059669',
                    padding: '3px 10px', borderRadius: 20,
                    fontSize: '0.78rem', fontWeight: 600,
                    border: '1px solid #d1fae5',
                  }}>
                    {user.car_color}
                  </span>
                )}
                {user.car_plate && (
                  <span style={{
                    background: '#1f2937', color: 'white',
                    padding: '3px 12px', borderRadius: 6,
                    fontSize: '0.82rem', fontWeight: 700,
                    letterSpacing: '1px', fontFamily: 'monospace',
                  }}>
                    {user.car_plate.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={18} color="#9ca3af" style={{ alignSelf: 'center' }} />
          </div>
        ) : (
          <div style={{
            marginTop: '10px', padding: '14px', borderRadius: 12,
            background: '#fffbeb', border: '1.5px dashed #fcd34d',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🚗</div>
            <p style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 500, margin: 0 }}>
              Добавьте данные машины — пассажиры увидят их перед поездкой
            </p>
          </div>
        )}
      </div>

      {/* ====== КАРТОЧКА ВЕРИФИКАЦИИ ====== */}
      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: user.is_verified ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#e5e7eb,#d1d5db)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1f2937' }}>
              {user.is_verified ? '✅ Аккаунт верифицирован' : 'Верификация аккаунта'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
              {user.is_verified
                ? 'Другие пользователи видят значок доверия на вашем профиле'
                : 'Повышает доверие — значок ✅ виден всем попутчикам'}
            </div>
          </div>
        </div>

        {!user.is_verified && (
          <>
            {/* Результат запроса */}
            {verifyResult && (
              <div style={{
                marginBottom: 10, padding: '10px 14px', borderRadius: 12,
                background: verifyResult.status === 'verified' ? '#f0fdf4'
                  : verifyResult.status === 'need_telegram' ? '#fffbeb'
                  : '#fef2f2',
                border: `1px solid ${
                  verifyResult.status === 'verified' ? '#bbf7d0'
                  : verifyResult.status === 'need_telegram' ? '#fde68a'
                  : '#fecdd3'
                }`,
                fontSize: '0.82rem',
                color: verifyResult.status === 'verified' ? '#065f46'
                  : verifyResult.status === 'need_telegram' ? '#92400e'
                  : '#9f1239',
              }}>
                {verifyResult.message}
              </div>
            )}

            {/* Кнопка ссылки на бота если нужно привязать Telegram */}
            {verifyResult?.status === 'need_telegram' && verifyResult.bot_url && (
              <a
                href={verifyResult.bot_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  width: '100%', padding: '11px', marginBottom: 8,
                  background: 'linear-gradient(135deg,#0088cc,#006fa8)',
                  color: 'white', borderRadius: 12, textDecoration: 'none',
                  fontWeight: 700, fontSize: '0.9rem',
                  boxShadow: '0 3px 12px rgba(0,136,204,0.35)',
                }}
              >
                <ExternalLink size={16} />
                Открыть Telegram-бота
              </a>
            )}

            {/* Основная кнопка верификации */}
            {verifyResult?.status !== 'verified' && (
              <button
                onClick={handleVerify}
                disabled={verifyLoading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '12px',
                  background: verifyLoading ? '#e5e7eb' : 'linear-gradient(135deg,#10b981,#059669)',
                  color: verifyLoading ? '#9ca3af' : 'white',
                  border: 'none', borderRadius: 12,
                  fontWeight: 700, fontSize: '0.92rem', cursor: verifyLoading ? 'wait' : 'pointer',
                  boxShadow: verifyLoading ? 'none' : '0 3px 12px rgba(16,185,129,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {verifyLoading
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Проверяем...</>
                  : verifyResult?.status === 'need_telegram'
                  ? '🔄 Проверить снова'
                  : <><ShieldCheck size={16} /> Верифицировать через Telegram</>}
              </button>
            )}
          </>
        )}
      </div>

      <div className="reviews-section">
        <h3>{t('profile.reviews_title')}</h3>
        {(user.reviews || []).length === 0 ? (
          <p className="no-reviews">{t('profile.no_reviews')}</p>
        ) : (
          <div className="reviews-list">
            {(user.reviews || []).map(review => (
              <div key={review.id} className="review-card glass-panel">
                <div className="review-header">
                  <span className="review-author">{review.author_name}</span>
                  <div className="review-rating">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                </div>
                <p className="review-text">"{review.text}"</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="settings-menu">
        <button className="menu-item" onClick={onShowHistory}>
          <Clock size={20} color="#4b5563" />
          <span>{t('profile.history')}</span>
          <ChevronRight size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
        </button>
        <button className="menu-item" onClick={onShowSettings}>
          <Settings size={20} color="#4b5563" />
          <span>{t('profile.settings')}</span>
          <ChevronRight size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
        </button>
        <button className="menu-item" style={{ color: '#f43f5e' }} onClick={() => {
          localStorage.removeItem('birge_token');
          if (onLogout) onLogout();
          else window.location.reload();
        }}>
          <LogOut size={20} color="#f43f5e" />
          <span>{t('profile.logout')}</span>
        </button>
      </div>

      <style>{`
        .profile {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          animation: fadeIn 0.3s ease-out;
        }
        .profile-header {
          text-align: center;
          padding: 2rem 1rem;
        }
        .avatar-container {
          position: relative;
          width: 90px;
          height: 90px;
          margin: 0 auto 1rem auto;
          cursor: pointer;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .profile-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid white;
        }
        .avatar-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 30%;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .avatar-container:hover .avatar-overlay {
          opacity: 1;
        }
        .avatar-loader {
          position: absolute; top:0; left:0; right:0; bottom:0;
          background: rgba(16,185,129,0.8);
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
        }
        .verified-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          background: var(--primary);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          z-index: 2;
        }
        .user-phone {
          color: #6b7280;
          font-size: 0.9rem;
          margin-top: 4px;
          margin-bottom: 1.5rem;
        }
        .stats-row {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          border-radius: 12px;
          padding: 12px;
        }
        .stat-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .stat-value {
          font-weight: 700;
          color: var(--dark);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 1.1rem;
        }
        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-divider {
          width: 1px;
          height: 30px;
          background: #e5e7eb;
        }
        .limits-card {
          padding: 1.2rem;
        }
        .limits-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .limits-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .limits-count {
          font-weight: 700;
          color: var(--dark);
        }
        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .limits-hint {
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.4;
        }
        .reviews-section h3 {
          font-size: 1.1rem;
          margin-bottom: 1rem;
          color: var(--dark);
        }
        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .review-card {
          padding: 1rem;
        }
        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .review-author {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .review-rating {
          display: flex;
          gap: 2px;
        }
        .review-text {
          font-size: 0.9rem;
          color: #4b5563;
          font-style: italic;
          line-height: 1.4;
        }
        .car-card {
          padding: 1.2rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .car-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .settings-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 2rem;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: background 0.2s;
        }
        .menu-item:hover {
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}
