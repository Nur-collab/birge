import React from 'react';
import { Star, Check, X, MapPin, Clock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TripRequestModal({ request, onAccept, onDecline }) {
    const { t } = useTranslation();

    if (!request) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', backdropFilter: 'blur(4px)',
        }}>
            <div style={{
                background: 'white', borderRadius: '20px', padding: '1.5rem',
                width: '100%', maxWidth: '360px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                animation: 'slideUp 0.3s ease',
            }}>
                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `}</style>

                {/* Заголовок */}
                <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 0.75rem', fontSize: '1.5rem'
                    }}>🙋</div>
                    <h3 style={{ color: '#1f2937', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                        Новый запрос на поездку!
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                        Пассажир хочет присоединиться
                    </p>
                </div>

                {/* Информация о пассажире */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#f9fafb', borderRadius: '12px', padding: '14px',
                    marginBottom: '1rem'
                }}>
                    <img
                        src={request.requester_photo || `https://i.pravatar.cc/80?u=${request.requester_id}`}
                        alt={request.requester_name}
                        style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #d1fae5' }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '1rem' }}>
                            {request.requester_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: '0.85rem' }}>
                            <Star size={13} fill="#f59e0b" />
                            {request.requester_rating?.toFixed(1)} Рейтинг
                        </div>
                    </div>
                </div>

                {/* Маршрут */}
                <div style={{
                    background: '#f0fdf4', borderRadius: '12px', padding: '12px 14px',
                    marginBottom: '1.2rem', fontSize: '0.9rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '6px', color: '#374151' }}>
                        <MapPin size={14} color="#10b981" />
                        <span>{request.origin}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '6px', color: '#374151' }}>
                        <MapPin size={14} color="#f43f5e" />
                        <span>{request.destination}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280' }}>
                        <Clock size={14} />
                        <span>{request.time}</span>
                    </div>
                </div>

                {/* Кнопки */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => onDecline(request.id)}
                        style={{
                            flex: 1, padding: '12px', border: '1px solid #e5e7eb',
                            borderRadius: '12px', background: 'white',
                            color: '#6b7280', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontSize: '0.95rem', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                        <X size={18} color="#f43f5e" /> Отклонить
                    </button>
                    <button
                        onClick={() => onAccept(request.id, request.trip_id, request.requester_id, request.requester_trip_id)}
                        style={{
                            flex: 2, padding: '12px', border: 'none',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontSize: '0.95rem', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(16,185,129,0.4)'
                        }}
                    >
                        <Check size={18} /> Принять
                    </button>
                </div>
            </div>
        </div>
    );
}
