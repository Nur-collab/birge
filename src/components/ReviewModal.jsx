import React, { useState } from 'react';
import { Star, X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ReviewModal({ partner, onSubmit, onSkip }) {
    const { t } = useTranslation();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [text, setText] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) return;
        setSubmitted(true);
        await onSubmit(rating, text.trim());
    };

    if (submitted) {
        return (
            <div className="modal-overlay">
                <div className="review-modal" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                    <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>{t('review.thanks')}</h3>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{t('review.community')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onSkip()}>
            <div className="review-modal">
                {/* Заголовок */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#1f2937', fontSize: '1.1rem' }}>{t('review.title')}</h3>
                    <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Аватар попутчика */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <img
                        src={partner?.photo || `https://i.pravatar.cc/150?u=${partner?.id}`}
                        alt={partner?.name}
                        style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: '3px solid #d1fae5', marginBottom: '8px' }}
                    />
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{partner?.name || t('matches.passenger')}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t('review.how_was_trip')}</div>
                </div>

                {/* Звёзды */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                transition: 'transform 0.1s',
                                transform: (hover || rating) >= star ? 'scale(1.2)' : 'scale(1)',
                            }}
                        >
                            <Star
                                size={36}
                                fill={(hover || rating) >= star ? '#f59e0b' : 'none'}
                                color={(hover || rating) >= star ? '#f59e0b' : '#d1d5db'}
                                strokeWidth={1.5}
                            />
                        </button>
                    ))}
                </div>

                {/* Подпись к рейтингу */}
                {(hover || rating) > 0 && (
                    <div style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1rem' }}>
                        {[t('review.rating.0'), t('review.terrible'), t('review.bad'), t('review.ok'), t('review.good'), t('review.great')][(hover || rating)]}
                    </div>
                )}

                {/* Комментарий */}
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('review.placeholder')}
                    rows={3}
                    style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        resize: 'none',
                        outline: 'none',
                        background: '#f9fafb',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                        marginBottom: '1rem',
                        fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />

                {/* Кнопки */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onSkip}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                            background: 'white',
                            color: '#6b7280',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                        }}
                    >
                        {t('review.skip')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0}
                        style={{
                            flex: 2,
                            padding: '12px',
                            border: 'none',
                            borderRadius: '10px',
                            background: rating === 0
                                ? '#e5e7eb'
                                : 'linear-gradient(135deg, #10b981, #059669)',
                            color: rating === 0 ? '#9ca3af' : 'white',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: rating === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'background 0.2s',
                        }}
                    >
                        <Send size={16} />
                        {t('review.submit')}
                    </button>
                </div>
            </div>

            <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }
        .review-modal {
          background: white;
          border-radius: 24px 24px 0 0;
          padding: 1.5rem;
          width: 100%;
          max-width: 480px;
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
}
