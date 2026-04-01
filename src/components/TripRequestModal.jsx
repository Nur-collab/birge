import React, { useEffect, useState } from 'react';
import { Star, Check, X, MapPin, Clock } from 'lucide-react';

const AUTO_DECLINE_SECONDS = 30;

export default function TripRequestModal({ request, onAccept, onDecline }) {
    const [timeLeft, setTimeLeft] = useState(AUTO_DECLINE_SECONDS);

    // Таймер: если водитель не ответил за 30 сек — автоотклонение
    useEffect(() => {
        if (!request) return;
        setTimeLeft(AUTO_DECLINE_SECONDS);
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onDecline(request.id);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [request?.id]);

    if (!request) return null;

    const progress = (timeLeft / AUTO_DECLINE_SECONDS) * 100;
    const urgency = timeLeft <= 10;

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(6px)',
        }}>
            <div style={{
                background: 'white', borderRadius: '24px', padding: '1.5rem',
                width: '100%', maxWidth: '360px',
                boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
                animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative', overflow: 'hidden',
            }}>
                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(50px) scale(0.9); opacity: 0; }
                        to { transform: translateY(0) scale(1); opacity: 1; }
                    }
                    @keyframes ringPulse {
                        0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
                        70% { box-shadow: 0 0 0 20px rgba(16,185,129,0); }
                        100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
                    }
                    @keyframes urgentPulse {
                        0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
                        70% { box-shadow: 0 0 0 16px rgba(239,68,68,0); }
                        100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
                    }
                `}</style>

                {/* Прогресс-бар вверху (тает по мере истечения времени) */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                    background: '#e5e7eb', borderRadius: '24px 24px 0 0',
                }}>
                    <div style={{
                        height: '100%', borderRadius: '24px 0 0 0',
                        background: urgency
                            ? 'linear-gradient(90deg, #ef4444, #f97316)'
                            : 'linear-gradient(90deg, #10b981, #34d399)',
                        width: `${progress}%`,
                        transition: 'width 1s linear, background 0.5s ease',
                    }} />
                </div>

                {/* Иконка-пульс */}
                <div style={{ textAlign: 'center', marginBottom: '1.2rem', paddingTop: '0.5rem' }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: urgency
                            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                            : 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 0.75rem',
                        fontSize: '1.75rem',
                        animation: urgency ? 'urgentPulse 1s ease-in-out infinite' : 'ringPulse 2s ease-in-out infinite',
                    }}>🙋</div>
                    <h3 style={{ color: '#1f2937', margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                        Новый запрос на поездку!
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px' }}>
                        Пассажир хочет присоединиться
                    </p>
                    {/* Таймер */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        marginTop: '6px',
                        padding: '4px 12px', borderRadius: '20px',
                        background: urgency ? '#fef2f2' : '#f0fdf4',
                        color: urgency ? '#ef4444' : '#059669',
                        fontSize: '0.82rem', fontWeight: 700,
                    }}>
                        <Clock size={13} />
                        {urgency ? `⚡ Ответьте за ${timeLeft} сек!` : `Автоотклонение через ${timeLeft} сек`}
                    </div>
                </div>

                {/* Информация о пассажире */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#f9fafb', borderRadius: '14px', padding: '14px',
                    marginBottom: '1rem',
                    border: '1.5px solid #e5e7eb',
                }}>
                    <img
                        src={request.requester_photo || `https://i.pravatar.cc/80?u=${request.requester_id}`}
                        alt={request.requester_name}
                        style={{
                            width: 56, height: 56, borderRadius: '50%',
                            objectFit: 'cover', border: '2.5px solid #d1fae5',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#1f2937', fontSize: '1.05rem' }}>
                            {request.requester_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: '0.85rem', marginTop: '3px' }}>
                            <Star size={13} fill="#f59e0b" />
                            <span style={{ fontWeight: 600 }}>{(request.requester_rating || 5.0).toFixed(1)}</span>
                            <span style={{ color: '#9ca3af', fontWeight: 400 }}>Рейтинг</span>
                        </div>
                    </div>
                </div>

                {/* Маршрут */}
                <div style={{
                    background: '#f0fdf4', borderRadius: '12px', padding: '12px 14px',
                    marginBottom: '1.2rem', fontSize: '0.88rem',
                    border: '1px solid #d1fae5',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '8px', color: '#374151' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{request.origin}</span>
                    </div>
                    <div style={{ width: 1, height: 12, background: '#86efac', marginLeft: 3, marginBottom: 8 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '8px', color: '#374151' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{request.destination}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', marginTop: 4 }}>
                        <Clock size={13} />
                        <span>{request.time}</span>
                    </div>
                </div>

                {/* Кнопки */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => onDecline(request.id)}
                        style={{
                            flex: 1, padding: '13px', border: '1.5px solid #e5e7eb',
                            borderRadius: '14px', background: 'white',
                            color: '#6b7280', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontSize: '0.95rem', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
                    >
                        <X size={18} /> Отклонить
                    </button>
                    <button
                        onClick={() => onAccept(request.id, request.trip_id, request.requester_id, request.requester_trip_id)}
                        style={{
                            flex: 2, padding: '13px', border: 'none',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white', fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontSize: '0.95rem', transition: 'all 0.2s',
                            boxShadow: '0 6px 20px rgba(16,185,129,0.4)',
                            letterSpacing: '0.3px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(16,185,129,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)'; }}
                    >
                        <Check size={18} /> Принять
                    </button>
                </div>
            </div>
        </div>
    );
}
