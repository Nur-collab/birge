import React, { useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';

// Список популярных мест Бишкека для автодополнения
const BISHKEK_PLACES = [
    'Жилмассив Ала-Арча',
    'Жилмассив Аламедин-1',
    'Жилмассив Аламедин-2',
    'Жилмассив Джал',
    'Жилмассив Кара-Жыгач',
    'Жилмассив Асанбай',
    'Жилмассив Тунгуч',
    'Жилмассив Восток-5',
    'Жилмассив МКр-7',
    'Жилмассив Южные Магистрали',
    'Жилмассив Ак-Орго',
    'Жилмассив Кок-Жар',
    'ЦУМ (Центр)',
    'Площадь Ала-Тоо',
    'Ошский базар',
    'Дордой Базар',
    'Аэропорт Манас',
    'Западный автовокзал',
    'АУЦА',
    'КНУ им. Баласагына',
    'Политехнический университет',
    'Кыргызско-Российский университет',
    'ГКБ №1 (Скорая)',
    'Национальный госпиталь',
    'ТЦ Бишкек Парк',
    'Парк Панфилова',
    'Проспект Чуй',
    'Пр. Манаса',
    'Улица Ахунбаева',
];

export default function AddressInput({ value, onChange, placeholder, iconColor = '#10b981', name }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const handleChange = (e) => {
        const val = e.target.value;
        onChange(val);
        if (val.length >= 2) {
            const filtered = BISHKEK_PLACES.filter(p =>
                p.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 5);
            setSuggestions(filtered);
            setShowDropdown(filtered.length > 0);
        } else {
            setShowDropdown(false);
        }
    };

    const handleSelect = (place) => {
        onChange(place);
        setShowDropdown(false);
        inputRef.current?.blur();
    };

    // Закрываем при клике вне
    useEffect(() => {
        const handler = (e) => {
            if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <MapPin
                size={18}
                style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: iconColor, pointerEvents: 'none', zIndex: 1
                }}
            />
            <input
                ref={inputRef}
                type="text"
                name={name}
                value={value}
                onChange={handleChange}
                onFocus={() => {
                    if (suggestions.length > 0) setShowDropdown(true);
                }}
                placeholder={placeholder}
                autoComplete="off"
                style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                }}
                onFocusCapture={(e) => { e.target.style.borderColor = iconColor; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; }}
            />

            {showDropdown && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        zIndex: 999,
                        overflow: 'hidden',
                        marginTop: '4px',
                    }}
                >
                    {suggestions.map((place, i) => (
                        <button
                            key={i}
                            type="button"
                            onMouseDown={() => handleSelect(place)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 14px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                color: '#374151',
                                transition: 'background 0.1s',
                                borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                            <MapPin size={14} color={iconColor} />
                            {place}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
