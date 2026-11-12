import React, { useState } from 'react';
import { ArrowRight, Phone, Shield, Loader, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

const mapAuthError = (message) => {
  if (!message) return 'Неверный или просроченный код';
  if (/invalid,\s*expired,\s*or\s*locked\s*code/i.test(message)) {
    return 'Неверный или просроченный код';
  }
  if (/phone number required/i.test(message)) {
    return 'Введите номер телефона';
  }
  return message;
};

// ─── Шаг 1: Ввод номера телефона ────────────────────────────
function PhoneStep({ onNext }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (val) => {
    let digits = val.replace(/\D/g, '');
    // Пользователь может вставить номер целиком: +996 555 123 456.
    if (digits.startsWith('996')) digits = digits.slice(3);
    // После +996 номер может начинаться с 0 (например, +996 0555...).
    if (digits.startsWith('0') && digits.length > 9) digits = digits.slice(1);
    digits = digits.slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, 3) + ' ' + digits.slice(3);
    return digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 9) {
      setError(t('auth.error_invalid_phone') || 'Введите 9 цифр после +996');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const fullPhone = '+996' + digits;
      const res = await api.sendCode(fullPhone);
      onNext(fullPhone, res);
    } catch (err) {
      console.error('[PhoneStep]', err);
      setError(mapAuthError(err.message) || 'Ошибка отправки кода. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-step">
      <div className="login-icon-circle">
        <Phone size={28} color="white" />
      </div>
      <h2 className="login-step-title">{t('auth.phone_number') || 'Номер телефона'}</h2>
      <p className="login-step-desc">{t('auth.enter_phone') || 'Введите номер телефона для входа в Birge'}</p>

      <form onSubmit={handleSubmit} className="login-form">
        <div className={`phone-input-wrap ${error ? 'has-error' : ''}`}>
          <span className="phone-prefix">+996</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setError(''); setPhone(formatPhone(e.target.value)); }}
            placeholder="555 123 456"
            className="phone-input"
            autoFocus
          />
        </div>
        {error && <p className="field-error">{error}</p>}

        <p className="sms-hint">📲 Код подтверждения придёт в Telegram или SMS</p>

        <button type="submit" className="login-btn" disabled={loading || phone.replace(/\D/g, '').length < 9}>
          {loading ? <Loader size={20} className="spin" /> : <>{t('auth.get_code') || 'Получить код'} <ArrowRight size={20} /></>}
        </button>

        <div className="telegram-hint-card">
          <Send size={16} color="#0284c7" />
          <span>Бот для быстрой авторизации: <a href="https://t.me/BirgeAuthBot" target="_blank" rel="noopener noreferrer">@BirgeAuthBot</a></span>
        </div>
      </form>
    </div>
  );
}

// ─── Шаг 2: Ввод кода подтверждения ─────────────────────────
function CodeStep({ phone, sendInfo, onBack, onVerified }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTelegram = sendInfo?.tg_linked;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    setError('');

    try {
      const data = await api.verifyCode(phone, code, name.trim());
      const user = data?.user || await api.getCurrentUser();
      if (!user) {
        throw new Error('Не удалось загрузить профиль. Попробуйте войти ещё раз.');
      }
      onVerified(user);
    } catch (err) {
      console.error('[CodeStep]', err);
      setError(mapAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-step">
      <div className="login-icon-circle" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <Shield size={28} color="white" />
      </div>
      <h2 className="login-step-title">{t('auth.sms_code') || 'Код подтверждения'}</h2>
      <p className="login-step-desc">{phone}</p>

      <div className={`sms-badge ${isTelegram ? 'tg-badge' : ''}`}>
        {isTelegram ? '✈️ Код отправлен в Telegram бота' : '📱 Код отправлен (проверьте Telegram или SMS)'}
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          inputMode="numeric"
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
          placeholder={t('settings.name') || 'Ваше имя'}
          className="name-input"
        />

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="login-btn" disabled={loading || code.length < 6}>
          {loading ? <Loader size={20} className="spin" /> : <>{t('auth.verify') || 'Войти'} <ArrowRight size={20} /></>}
        </button>

        <button type="button" className="back-btn" onClick={onBack}>
          ← {t('back') || 'Назад'}
        </button>
      </form>
    </div>
  );
}

// ─── Главный компонент ───────────────────────────────────────
export default function Login({ onLoggedIn }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [sendInfo, setSendInfo] = useState(null);

  return (
    <div className="login-screen">
      <div className="bg-circle bg-circle-1" />
      <div className="bg-circle bg-circle-2" />
      <div className="bg-circle bg-circle-3" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-badge">Б</div>
          <div>
            <h1>{t('title') || 'BIRGE'}</h1>
          </div>
        </div>

        <div className="login-steps-indicator">
          <div className={`step-dot ${step === 'phone' ? 'active' : 'done'}`} />
          <div className="step-line" />
          <div className={`step-dot ${step === 'code' ? 'active' : ''}`} />
        </div>

        {step === 'phone' ? (
          <PhoneStep
            onNext={(ph, info) => {
              setPhone(ph);
              setSendInfo(info);
              setStep('code');
            }}
          />
        ) : (
          <CodeStep
            phone={phone}
            sendInfo={sendInfo}
            onBack={() => setStep('phone')}
            onVerified={onLoggedIn}
          />
        )}
      </div>

      <p className="login-footer">
        Входя, вы соглашаетесь с <a href="/terms.html" target="_blank" rel="noopener noreferrer">Правилами</a> и <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</a>
      </p>

      <style>{`
        .login-screen {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg-app);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: background-color 0.25s ease;
        }
        .bg-circle { position:absolute; border-radius:50%; opacity:0.12; pointer-events:none; }
        .bg-circle-1 { width:320px;height:320px; background:radial-gradient(circle,#10b981,transparent); top:-100px;right:-80px; }
        .bg-circle-2 { width:240px;height:240px; background:radial-gradient(circle,#059669,transparent); bottom:-60px;left:-60px; }
        .bg-circle-3 { width:160px;height:160px; background:radial-gradient(circle,#34d399,transparent); top:40%;left:-40px; }
        .login-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          padding: 2rem;
          width: 100%;
          max-width: 380px;
          box-shadow: var(--floating-shadow);
          position: relative;
          z-index: 1;
          transition: background-color 0.25s, border-color 0.25s;
        }
        .login-logo { display:flex; align-items:center; gap:12px; margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); }
        .login-logo-badge {
          width: 48px; height: 48px;
          background: linear-gradient(135deg,#10b981,#059669);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 900; color: white;
          box-shadow: 0 4px 14px var(--primary-glow);
          flex-shrink: 0;
        }
        .login-logo h1 { font-size:1.5rem; font-weight:900; color:var(--text-main); letter-spacing:2px; line-height:1; }
        .login-steps-indicator { display:flex; align-items:center; justify-content:center; gap:0; margin-bottom:1.5rem; }
        .step-dot { width:10px;height:10px; border-radius:50%; background:var(--border-subtle); transition:all 0.3s; }
        .step-dot.active { background:var(--primary); box-shadow:0 0 0 3px var(--primary-glow); width:12px;height:12px; }
        .step-dot.done { background:var(--primary); }
        .step-line { width:40px;height:2px; background:var(--border-subtle); margin:0 4px; }
        .login-step { display:flex; flex-direction:column; align-items:center; gap:0.75rem; text-align:center; }
        .login-icon-circle {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg,#10b981,#059669);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px var(--primary-glow);
          margin-bottom: 0.25rem;
        }
        .login-step-title { font-size:1.25rem; font-weight:700; color:var(--text-main); }
        .login-step-desc { font-size:0.88rem; color:var(--text-muted); line-height:1.5; }
        .sms-badge {
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 0.83rem;
          color: var(--primary);
          font-weight: 600;
          width: 100%;
          box-sizing: border-box;
          text-align: center;
        }
        .sms-badge.tg-badge { background:rgba(14,165,233,0.12); border-color:rgba(14,165,233,0.3); color:#0284c7; }
        .sms-hint { font-size:0.82rem; color:var(--text-muted); margin:0; }
        .telegram-hint-card { display:flex; align-items:center; gap:8px; background:var(--bg-subtle); border:1px solid var(--border-subtle); border-radius:10px; padding:8px 12px; font-size:0.8rem; color:var(--text-muted); text-align:left; margin-top:4px; }
        .telegram-hint-card a { color:#0284c7; font-weight:600; text-decoration:underline; }
        .login-form { width:100%; display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem; }
        .phone-input-wrap {
          display: flex;
          align-items: center;
          border: 1.5px solid var(--border-subtle);
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s, background-color 0.2s;
          background: var(--bg-input);
        }
        .phone-input-wrap:focus-within { border-color:var(--primary); background:var(--bg-card); box-shadow:0 0 0 3px var(--primary-glow); }
        .phone-input-wrap.has-error { border-color:#ef4444; }
        .phone-prefix {
          padding: 0 14px;
          font-weight: 700;
          color: var(--text-main);
          background: var(--bg-subtle);
          border-right: 1.5px solid var(--border-subtle);
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
          color: var(--text-main);
          font-weight: 600;
          letter-spacing: 1px;
        }
        .phone-input::placeholder { color:var(--text-subtle); font-weight:400; letter-spacing:0; }
        .code-input {
          width: 100%;
          padding: 16px;
          text-align: center;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 12px;
          border: 1.5px solid var(--border-subtle);
          border-radius: 12px;
          outline: none;
          transition: all 0.2s;
          color: var(--text-main);
          background: var(--bg-input);
          box-sizing: border-box;
        }
        .code-input:focus { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-glow); background:var(--bg-card); }
        .name-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid var(--border-subtle);
          border-radius: 12px;
          font-size: 0.95rem;
          outline: none;
          background: var(--bg-input);
          color: var(--text-main);
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .name-input:focus { border-color:var(--primary); background:var(--bg-card); box-shadow:0 0 0 3px var(--primary-glow); }
        .name-input::placeholder { color:var(--text-subtle); }
        .field-error { font-size:0.82rem; color:#dc2626; background:rgba(239,68,68,0.1); padding:8px 12px; border-radius:8px; text-align:left; margin:0; }
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 15px;
          background: linear-gradient(135deg,#10b981,#059669);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 18px var(--primary-glow);
          letter-spacing: 0.3px;
        }
        .login-btn:hover:not(:disabled) { transform:translateY(-1.5px); box-shadow:0 8px 24px var(--primary-glow); }
        .login-btn:active:not(:disabled) { transform:scale(0.99); }
        .login-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .back-btn { background:none; border:none; color:var(--text-muted); font-size:0.9rem; cursor:pointer; padding:4px; transition:color 0.2s; }
        .back-btn:hover { color:var(--text-main); }
        .login-footer { margin-top:1.5rem; font-size:0.78rem; color:var(--text-subtle); text-align:center; z-index:1; position:relative; }
        .login-footer a { color:var(--primary); text-decoration:none; }
        @keyframes spin { 100% { transform:rotate(360deg); } }
        .spin { animation:spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
