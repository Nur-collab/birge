import React, { useState } from 'react';
import { ArrowRight, Phone, Shield, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

// Шаг 1: Ввод номера телефона
function PhoneStep({ onNext }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError(t('auth.error_invalid_phone'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const cleanPhone = '+996 ' + phone.replace(/\D/g, '').slice(-9);
      const result = await api.sendCode(cleanPhone);
      onNext(cleanPhone, result.dev_code);
    } catch {
      setError(t('auth.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, 3) + ' ' + digits.slice(3);
    return digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6);
  };

  return (
    <div className="login-step">
      <div className="login-icon-circle">
        <Phone size={28} color="white" />
      </div>
      <h2 className="login-step-title">{t('auth.phone_number')}</h2>
      <p className="login-step-desc">{t('auth.enter_phone')}</p>

      <form onSubmit={handleSubmit} className="login-form">
        <div className={`phone-input-wrap ${error ? 'has-error' : ''}`}>
          <span className="phone-prefix">+996</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setError('');
              setPhone(formatPhone(e.target.value));
            }}
            placeholder="555 123 456"
            className="phone-input"
            autoFocus
          />
        </div>
        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="login-btn" disabled={loading || !phone}>
          {loading ? <Loader size={20} className="spin" /> : <>{t('auth.get_code')} <ArrowRight size={20} /></>}
        </button>
      </form>
    </div>
  );
}

// Шаг 2: Ввод SMS кода
function CodeStep({ phone, devCode, onBack, onVerified }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.verifyCode(phone, code, name);
      localStorage.setItem('birge_token', result.access_token);
      onVerified();
    } catch {
      setError(t('auth.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-step">
      <div className="login-icon-circle" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <Shield size={28} color="white" />
      </div>
      <h2 className="login-step-title">{t('auth.sms_code')}</h2>
      <p className="login-step-desc">
        {phone}
      </p>

      {devCode && (
        <div className="dev-badge">
          🔑 {t('auth.check_sms')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          value={code}
          onChange={(e) => { setError(''); setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
          placeholder="••••••"
          className="code-input"
          maxLength={6}
          autoFocus
        />

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('settings.name')}
          className="name-input"
        />

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="login-btn" disabled={loading || code.length < 6}>
          {loading ? <Loader size={20} className="spin" /> : <>{t('auth.verify')} <ArrowRight size={20} /></>}
        </button>

        <button type="button" className="back-btn" onClick={onBack}>
          ← {t('back')}
        </button>
      </form>
    </div>
  );
}

// Главный компонент
export default function Login({ onLoggedIn }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [devCode, setDevCode] = useState('');

  return (
    <div className="login-screen">
      {/* Фоновые декоративные круги */}
      <div className="bg-circle bg-circle-1" />
      <div className="bg-circle bg-circle-2" />
      <div className="bg-circle bg-circle-3" />

      <div className="login-card">
        {/* Логотип */}
        <div className="login-logo">
          <div className="login-logo-badge">Б</div>
          <div>
            <h1>{t('title')}</h1>
          </div>
        </div>

        {/* Шаги */}
        <div className="login-steps-indicator">
          <div className={`step-dot ${step === 'phone' ? 'active' : 'done'}`} />
          <div className="step-line" />
          <div className={`step-dot ${step === 'code' ? 'active' : step === 'done' ? 'done' : ''}`} />
        </div>

        {/* Контент шага */}
        {step === 'phone' ? (
          <PhoneStep
            onNext={(ph, code) => {
              setPhone(ph);
              setDevCode(code);
              setStep('code');
            }}
          />
        ) : (
          <CodeStep
            phone={phone}
            devCode={devCode}
            onBack={() => setStep('phone')}
            onVerified={onLoggedIn}
          />
        )}
      </div>

      <p className="login-footer">
        Входя, вы соглашаетесь с <a href="#">Правилами</a> и <a href="#">Политикой конфиденциальности</a>
      </p>

      <style>{`
        .login-screen {
          min-height: 100vh;
          background: linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .bg-circle {
          position: absolute;
          border-radius: 50%;
          opacity: 0.15;
          pointer-events: none;
        }
        .bg-circle-1 {
          width: 320px; height: 320px;
          background: radial-gradient(circle, #4ade80, transparent);
          top: -100px; right: -80px;
        }
        .bg-circle-2 {
          width: 240px; height: 240px;
          background: radial-gradient(circle, #22c55e, transparent);
          bottom: -60px; left: -60px;
        }
        .bg-circle-3 {
          width: 160px; height: 160px;
          background: radial-gradient(circle, #86efac, transparent);
          top: 40%; left: -40px;
        }
        .login-card {
          background: white;
          border-radius: 24px;
          padding: 2rem;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.04);
          position: relative;
          z-index: 1;
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #f3f4f6;
        }
        .login-logo-badge {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 900;
          color: white;
          box-shadow: 0 4px 12px rgba(34,197,94,0.35);
          flex-shrink: 0;
        }
        .login-logo h1 {
          font-size: 1.5rem;
          font-weight: 900;
          color: #111827;
          letter-spacing: 2px;
          line-height: 1;
        }
        .login-logo p {
          font-size: 0.78rem;
          color: #9ca3af;
          margin-top: 2px;
        }

        /* Индикатор шагов */
        .login-steps-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 1.5rem;
        }
        .step-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #e5e7eb;
          transition: all 0.3s;
        }
        .step-dot.active {
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
          width: 12px; height: 12px;
        }
        .step-dot.done {
          background: #22c55e;
        }
        .step-line {
          width: 40px;
          height: 2px;
          background: #e5e7eb;
          margin: 0 4px;
        }

        /* Контент шага */
        .login-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          text-align: center;
        }
        .login-icon-circle {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(34,197,94,0.3);
          margin-bottom: 0.25rem;
        }
        .login-step-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }
        .login-step-desc {
          font-size: 0.88rem;
          color: #6b7280;
          line-height: 1.5;
        }
        .dev-badge {
          background: #fef9c3;
          border: 1px dashed #fbbf24;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 0.82rem;
          color: #92400e;
          width: 100%;
        }

        /* Форма */
        .login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .phone-input-wrap {
          display: flex;
          align-items: center;
          border: 1.5px solid #d1d5db;
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s;
          background: #f9fafb;
        }
        .phone-input-wrap:focus-within {
          border-color: #22c55e;
          background: white;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.1);
        }
        .phone-input-wrap.has-error {
          border-color: #ef4444;
        }
        .phone-prefix {
          padding: 0 12px;
          font-weight: 600;
          color: #374151;
          background: #f3f4f6;
          border-right: 1.5px solid #d1d5db;
          height: 100%;
          display: flex;
          align-items: center;
          font-size: 0.95rem;
          white-space: nowrap;
        }
        .phone-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 14px 14px;
          font-size: 1rem;
          background: transparent;
          color: #111827;
          font-weight: 500;
          letter-spacing: 1px;
        }
        .phone-input::placeholder { color: #d1d5db; font-weight: 400; letter-spacing: 0; }
        .code-input {
          width: 100%;
          padding: 16px;
          text-align: center;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 12px;
          border: 1.5px solid #d1d5db;
          border-radius: 12px;
          outline: none;
          transition: all 0.2s;
          color: #111827;
          background: #f9fafb;
        }
        .code-input:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.1);
          background: white;
        }
        .name-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid #d1d5db;
          border-radius: 12px;
          font-size: 0.95rem;
          outline: none;
          background: #f9fafb;
          color: #374151;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .name-input:focus {
          border-color: #22c55e;
          background: white;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.1);
        }
        .name-input::placeholder { color: #9ca3af; }
        .field-error {
          font-size: 0.82rem;
          color: #dc2626;
          background: #fef2f2;
          padding: 8px 12px;
          border-radius: 8px;
          text-align: left;
        }
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 15px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(34,197,94,0.35);
          letter-spacing: 0.3px;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(34,197,94,0.45);
        }
        .login-btn:active:not(:disabled) { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .back-btn {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }
        .back-btn:hover { color: #374151; }

        .login-footer {
          margin-top: 1.5rem;
          font-size: 0.78rem;
          color: #9ca3af;
          text-align: center;
          z-index: 1;
          position: relative;
        }
        .login-footer a { color: #22c55e; text-decoration: none; }

        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
