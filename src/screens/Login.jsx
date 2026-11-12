import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Phone, ShieldCheck, Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

const mapAuthError = (message) => {
  if (!message) return 'Неверный или просроченный код';
  if (/invalid,\s*expired,\s*or\s*locked\s*code/i.test(message)) {
    return 'Неверный или просроченный код подтверждения';
  }
  if (/phone number required/i.test(message)) {
    return 'Укажите номер телефона';
  }
  if (/too many requests/i.test(message)) {
    return 'Слишком много попыток. Подождите 1 минуту.';
  }
  return message;
};

// SVG флаг Кыргызстана для международного поля ввода
const KyrgyzstanFlag = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" fill="none" style={{ borderRadius: 2, flexShrink: 0 }}>
    <rect width="20" height="14" fill="#E8112D" />
    <circle cx="10" cy="7" r="3.2" fill="#FFE800" />
    <circle cx="10" cy="7" r="2.4" fill="#E8112D" />
    <circle cx="10" cy="7" r="1.8" fill="#FFE800" />
    <path d="M10 4.2V9.8M7.2 7H12.8M8 5.2L12 8.8M8 8.8L12 5.2" stroke="#E8112D" strokeWidth="0.6" />
  </svg>
);

// ─── Шаг 1: Ввод номера телефона ────────────────────────────
function PhoneStep({ onNext }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (val) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('996')) digits = digits.slice(3);
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
      setError(mapAuthError(err.message) || 'Ошибка отправки кода. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-step">
      <div className="login-step-header">
        <h2 className="login-title">Вход в BIRGE</h2>
        <p className="login-desc">Сервис совместных поездок по Кыргызстану</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="field-group">
          <label className="input-label">Номер телефона</label>
          <div className={`phone-input-wrap ${error ? 'has-error' : ''}`}>
            <div className="phone-prefix-pill">
              <KyrgyzstanFlag />
              <span className="prefix-code">+996</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setError(''); setPhone(formatPhone(e.target.value)); }}
              placeholder="555 123 456"
              className="phone-native-input"
              autoFocus
            />
          </div>
          {error && (
            <div className="auth-error-banner">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="primary-btn submit-btn" 
          disabled={loading || phone.replace(/\D/g, '').length < 9}
        >
          {loading ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <>
              <span>Получить код</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        <div className="auth-channel-card">
          <div className="channel-icon-wrap">
            <Send size={15} />
          </div>
          <div className="channel-info">
            <span className="channel-title">Быстрый код в Telegram</span>
            <span className="channel-sub">
              Запустите бота <a href="https://t.me/BirgeAuthBot" target="_blank" rel="noopener noreferrer">@BirgeAuthBot</a> для моментального получения кода
            </span>
          </div>
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
        throw new Error('Не удалось загрузить профиль. Попробуйте войти еще раз.');
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
      <div className="login-step-header">
        <h2 className="login-title">Подтверждение</h2>
        <p className="login-desc">Код отправлен на номер <strong style={{ color: 'var(--text-main)' }}>{phone}</strong></p>
      </div>

      <div className={`delivery-notice ${isTelegram ? 'telegram-delivery' : ''}`}>
        <CheckCircle2 size={15} />
        <span>
          {isTelegram 
            ? 'Код отправлен в Telegram бот @BirgeAuthBot' 
            : 'Проверьте входящие SMS или Telegram бот'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="field-group">
          <label className="input-label">6-значный код</label>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => { setError(''); setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
            placeholder="••••••"
            className="code-digit-input"
            maxLength={6}
            autoFocus
          />
        </div>

        <div className="field-group">
          <label className="input-label">Имя (для новых пользователей)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="pro-input"
          />
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          className="primary-btn submit-btn" 
          disabled={loading || code.length < 6}
        >
          {loading ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <>
              <span>Подтвердить и войти</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        <button type="button" className="auth-back-action" onClick={onBack}>
          <ArrowLeft size={15} />
          <span>Изменить номер</span>
        </button>
      </form>
    </div>
  );
}

// ─── Главный экран авторизации ───────────────────────────────
export default function Login({ onLoggedIn }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [sendInfo, setSendInfo] = useState(null);

  return (
    <div className="login-screen">
      <div className="auth-card">
        {/* Бренд */}
        <div className="auth-brand">
          <div className="auth-logo-badge">B</div>
          <div className="auth-brand-info">
            <div className="auth-brand-title">BIRGE</div>
            <div className="auth-brand-tagline">MOBILITY NETWORK</div>
          </div>
        </div>

        {/* Индикатор прогресса */}
        <div className="auth-progress-bar">
          <div className={`progress-segment ${step === 'phone' ? 'active' : 'completed'}`} />
          <div className={`progress-segment ${step === 'code' ? 'active' : ''}`} />
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

      <div className="auth-footer-legal">
        Нажимая «Получить код», вы соглашаетесь с <a href="/terms.html" target="_blank" rel="noopener noreferrer">Правилами</a> и <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</a>
      </div>

      <style>{`
        .login-screen {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg-app);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 1rem;
          position: relative;
          transition: background-color 0.25s ease;
        }
        .auth-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 2rem 1.75rem;
          width: 100%;
          max-width: 400px;
          box-shadow: var(--floating-shadow);
          transition: background-color 0.25s, border-color 0.25s;
        }
        .auth-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1.5rem;
        }
        .auth-logo-badge {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          font-weight: 800;
          color: #ffffff;
          box-shadow: 0 4px 12px var(--primary-glow);
          letter-spacing: -0.5px;
        }
        .auth-brand-info {
          display: flex;
          flex-direction: column;
        }
        .auth-brand-title {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-main);
          line-height: 1.1;
        }
        .auth-brand-tagline {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--primary);
        }
        .auth-progress-bar {
          display: flex;
          gap: 6px;
          margin-bottom: 1.5rem;
        }
        .progress-segment {
          flex: 1;
          height: 3px;
          background: var(--border-subtle);
          border-radius: 2px;
          transition: all 0.25s ease;
        }
        .progress-segment.active {
          background: var(--primary);
        }
        .progress-segment.completed {
          background: var(--primary);
          opacity: 0.6;
        }
        .login-step-header {
          margin-bottom: 1.25rem;
        }
        .login-title {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-main);
          margin-bottom: 4px;
        }
        .login-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-label {
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .phone-input-wrap {
          display: flex;
          align-items: center;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: var(--bg-input);
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .phone-input-wrap:focus-within {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--primary-glow);
          background: var(--bg-card);
        }
        .phone-input-wrap.has-error {
          border-color: #ef4444;
        }
        .phone-prefix-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          background: var(--bg-subtle);
          border-right: 1px solid var(--border-subtle);
          height: 48px;
        }
        .prefix-code {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .phone-native-input {
          flex: 1;
          height: 48px;
          padding: 0 14px;
          border: none;
          background: transparent;
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-main);
          letter-spacing: 0.05em;
          outline: none;
        }
        .phone-native-input::placeholder {
          color: var(--text-subtle);
          font-weight: 400;
          letter-spacing: 0;
        }
        .code-digit-input {
          width: 100%;
          height: 52px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: var(--bg-input);
          text-align: center;
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: 10px;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s;
        }
        .code-digit-input:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--primary-glow);
          background: var(--bg-card);
        }
        .auth-error-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 0.78rem;
          color: #ef4444;
          font-weight: 600;
        }
        .delivery-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 1.25rem;
        }
        .delivery-notice.telegram-delivery {
          background: rgba(14, 165, 233, 0.08);
          border-color: rgba(14, 165, 233, 0.25);
          color: #0284c7;
        }
        .auth-channel-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          text-align: left;
        }
        .channel-icon-wrap {
          color: #0284c7;
          margin-top: 1px;
        }
        .channel-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .channel-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .channel-sub {
          font-size: 0.74rem;
          color: var(--text-muted);
          line-height: 1.35;
        }
        .channel-sub a {
          color: #0284c7;
          font-weight: 700;
          text-decoration: underline;
        }
        .submit-btn {
          height: 48px;
          margin-top: 0.25rem;
        }
        .auth-back-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          padding: 6px;
          transition: color 0.15s;
        }
        .auth-back-action:hover {
          color: var(--text-main);
        }
        .auth-footer-legal {
          margin-top: 1.5rem;
          font-size: 0.74rem;
          color: var(--text-subtle);
          text-align: center;
          max-width: 360px;
          line-height: 1.4;
        }
        .auth-footer-legal a {
          color: var(--text-muted);
          text-decoration: underline;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
