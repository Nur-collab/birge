import React, { useState } from 'react';
import { ArrowLeft, Save, Car, User, Camera, ShieldAlert, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

export default function Settings({ currentUser, onBack, onUpdate }) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    photo: currentUser?.photo || '',
    car_model: currentUser?.car_model || '',
    car_color: currentUser?.car_color || '',
    car_plate: currentUser?.car_plate || '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updatedUser = await api.updateProfile(formData);
      setSaved(true);
      if (onUpdate) onUpdate(updatedUser);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Не удалось сохранить изменения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings screen-content">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h2>{t('settings.title')}</h2>
        <div style={{ width: 24 }}></div>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">

        {/* Блок Язык приложения */}
        <div className="settings-section glass-panel">
          <div className="section-title">
            <Globe size={18} color="var(--primary)" />
            <span>{t('settings.language')}</span>
          </div>
          <div className="form-group">
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="language-select"
            >
              <option value="ru">Русский</option>
              <option value="ky">Кыргызча</option>
            </select>
          </div>
        </div>

        {/* Блок Личные данные */}
        <div className="settings-section glass-panel">
          <div className="section-title">
            <User size={18} color="var(--primary)" />
            <span>{t('settings.personal')}</span>
          </div>

          <div className="form-group">
            <label>{t('settings.name')}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('settings.photo_url')}</label>
            <div className="input-with-icon">
              <Camera size={18} color="#9ca3af" />
              <input
                type="text"
                name="photo"
                value={formData.photo}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
            {formData.photo && (
              <img
                src={formData.photo}
                alt="Предпросмотр"
                style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', marginTop: 10, border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
          </div>
        </div>

        {/* Блок Данные машины */}
        <div className="settings-section glass-panel">
          <div className="section-title">
            <Car size={18} color="var(--primary)" />
            <span>{t('settings.driver_info')}</span>
          </div>

          <div className="form-group">
            <label>{t('settings.car_model')}</label>
            <input
              type="text"
              name="car_model"
              value={formData.car_model}
              onChange={handleChange}
              placeholder="e.g. Toyota Camry"
            />
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label>{t('settings.car_color')}</label>
              <input
                type="text"
                name="car_color"
                value={formData.car_color}
                onChange={handleChange}
                placeholder="Белый"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>{t('settings.car_plate')}</label>
              <input
                type="text"
                name="car_plate"
                value={formData.car_plate}
                onChange={handleChange}
                placeholder="01KG 123 ABC"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>
        </div>

        {/* Блок Безопасность */}
        <div className="settings-section glass-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="section-title" style={{ color: '#d97706' }}>
            <ShieldAlert size={18} />
            <span>Верификация</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '8px' }}>
            Ваш телефон: <b>{currentUser?.phone}</b>
          </p>
          <p style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '4px' }}>
            Статус: {currentUser?.is_verified ? <span style={{ color: '#10b981', fontWeight: 600 }}>Подтверждён</span> : <span style={{ color: '#f59e0b', fontWeight: 600 }}>Базовый</span>}
          </p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          type="submit"
          className="primary-btn save-btn"
          disabled={loading || saved}
        >
          {loading ? <div className="loader-small"></div> : <Save size={20} />}
          <span>{saved ? t('settings.saved_success') : t('save')}</span>
        </button>

      </form>

      <style>{`
        .settings {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0 1.5rem 0;
        }
        .settings-header h2 {
          font-size: 1.2rem;
          color: var(--dark);
          margin: 0;
        }
        .back-btn {
          background: none;
          border: none;
          color: #4b5563;
          padding: 8px;
          margin-left: -8px;
          cursor: pointer;
        }
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .settings-section {
          padding: 1.2rem;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 1rem;
          color: var(--dark);
          margin-bottom: 1rem;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 8px;
        }
        .section-desc {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 1rem;
          margin-top: -8px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group:last-child {
          margin-bottom: 0;
        }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 6px;
        }
        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          transition: border-color 0.2s;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .input-with-icon {
          position: relative;
        }
        .input-with-icon svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
        }
        .input-with-icon input {
          padding-left: 36px;
        }
        .language-select {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
          outline: none;
        }
        .language-select:focus {
          border-color: var(--primary);
        }
        .save-btn {
          margin-top: 1rem;
          background: ${saved ? '#10b981' : 'var(--primary)'};
          transition: all 0.3s;
        }
        .error-msg {
          color: #dc2626;
          background: #fee2e2;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.9rem;
          text-align: center;
        }
        .loader-small {
          width: 20px;
          height: 20px;
          border: 2px solid white;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
