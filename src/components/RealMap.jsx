import React, { useRef } from 'react';
import { YMaps, Map, Placemark, GeolocationControl, ZoomControl, Polyline } from '@pbe/react-yandex-maps';
import { MapPin } from 'lucide-react';

// Центр Бишкека
const BISHKEK_CENTER = [42.8746, 74.5698];

// Словарь известных точек Бишкека для геокодирования (оффлайн-fallback)
const BISHKEK_LOCATIONS = {
    // Жилмассивы
    'ала-арча': [42.8380, 74.5520],
    'ала арча': [42.8380, 74.5520],
    'аламедин': [42.8700, 74.5200],
    'джал': [42.8200, 74.5700],
    'кара-жыгач': [42.8650, 74.5050],
    'кара жыгач': [42.8650, 74.5050],
    'асанбай': [42.8450, 74.6300],
    'тунгуч': [42.8920, 74.5980],
    'восток-5': [42.8750, 74.6100],
    'восток 5': [42.8750, 74.6100],
    'мкр 7': [42.8550, 74.5650],

    // Центр и районы
    'цум': [42.8760, 74.6050],
    'центр': [42.8746, 74.5698],
    'площадь': [42.8762, 74.6036],
    'ала-тоо': [42.8762, 74.6036],
    'ошский базар': [42.8820, 74.5780],
    'ошский': [42.8820, 74.5780],
    'дордой': [42.9100, 74.6300],
    'кузнечная': [42.8780, 74.5850],
    'карпинка': [42.8670, 74.6010],

    // Аэропорт / Автовокзал
    'манас': [42.8474, 74.4776],
    'аэропорт': [42.8474, 74.4776],
    'западный автовокзал': [42.8700, 74.5500],
};

function geocodeOffline(locationStr) {
    if (!locationStr) return null;
    const lower = locationStr.toLowerCase().trim();
    for (const [key, coords] of Object.entries(BISHKEK_LOCATIONS)) {
        if (lower.includes(key)) return coords;
    }
    return null;
}

export default function RealMap({ from, to, height = "250px", showUserOnly = false }) {
    const ymapsRef = useRef(null);
    const mapRef = useRef(null);
    const routeRef = useRef(null);
    const [userLocation, setUserLocation] = React.useState(null);
    const [fromCoords, setFromCoords] = React.useState(geocodeOffline(from) || [42.8500, 74.5600]);
    const [toCoords, setToCoords] = React.useState(geocodeOffline(to) || [42.8900, 74.6100]);

    React.useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                (err) => console.log('Geolocation disabled or denied', err),
                { timeout: 5000 }
            );
        }
    }, []);

    // Реальное геокодирование через API Яндекса (если загрузился)
    React.useEffect(() => {
        if (!ymapsRef.current || showUserOnly) return;
        
        const geocodeAddress = async (address, setter, fallbackStr) => {
            if (!address) return;
            const offlineCoords = geocodeOffline(address);
            if (offlineCoords) {
                setter(offlineCoords);
                return;
            }
            try {
                // Добавляем "Бишкек ", чтобы геокодер искал именно в нашем городе
                const res = await ymapsRef.current.geocode(`Бишкек, ${address}`, { results: 1 });
                const firstGeoObject = res.geoObjects.get(0);
                if (firstGeoObject) {
                    setter(firstGeoObject.geometry.getCoordinates());
                } else {
                    setter(geocodeOffline(fallbackStr) || BISHKEK_CENTER);
                }
            } catch (e) {
                console.warn('Geocoding error:', e);
            }
        };

        geocodeAddress(from, setFromCoords, 'центр');
        geocodeAddress(to, setToCoords, 'цум');
    }, [from, to, showUserOnly]);

    // Вычисляем центр карты между двумя точками или центрируем на пользователе
    const centerLat = showUserOnly && userLocation ? userLocation[0] : (fromCoords[0] + toCoords[0]) / 2;
    const centerLng = showUserOnly && userLocation ? userLocation[1] : (fromCoords[1] + toCoords[1]) / 2;

    const handleApiAvailable = (ymaps) => {
        ymapsRef.current = ymaps;
    };

    const handleMapLoad = (map) => {
        mapRef.current = map;
        if (!ymapsRef.current) return;

        if (showUserOnly) return;

        // Строим маршрут через многоточечный роутер Яндекс
        try {
            const multiRoute = new ymapsRef.current.multiRouter.MultiRoute(
                {
                    referencePoints: [fromCoords, toCoords],
                    params: { routingMode: 'auto' }
                },
                {
                    boundsAutoApply: true,
                    routeActiveStrokeColor: '#10b981',
                    routeActiveStrokeWidth: 5,
                    routeStrokeColor: '#d1fae5',
                    routeStrokeWidth: 3,
                    wayPointStartIconColor: '#10b981',
                    wayPointFinishIconColor: '#f43f5e',
                }
            );
            routeRef.current = multiRoute;
            map.geoObjects.add(multiRoute);
        } catch (e) {
            console.warn('MultiRoute not available, using polyline fallback', e);
        }
    };

    // Обновляем маршрут, если изменились координаты
    React.useEffect(() => {
        if (!routeRef.current || showUserOnly) return;
        routeRef.current.model.setReferencePoints([fromCoords, toCoords]);
    }, [fromCoords, toCoords, showUserOnly]);

    return (
        <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' }}>
            <YMaps
                query={{ lang: 'ru_RU', load: 'package.full' }}
                onApiAvailable={handleApiAvailable}
            >
                <Map
                    state={{
                        center: [centerLat, centerLng],
                        zoom: 12,
                    }}
                    width="100%"
                    height="100%"
                    instanceRef={handleMapLoad}
                    options={{ suppressMapOpenBlock: true }}
                >
                    <GeolocationControl options={{ float: 'right' }} />
                    <ZoomControl options={{ float: 'left' }} />

                    {/* Маркер пользователя */}
                    {userLocation && (
                        <Placemark
                            geometry={userLocation}
                            options={{
                                preset: 'islands#blueCircleDotIcon',
                                iconColor: '#3b82f6'
                            }}
                            properties={{ hintContent: 'Вы здесь' }}
                        />
                    )}

                    {!showUserOnly && (
                        <>
                            {/* Точка А — Откуда */}
                            <Placemark
                                geometry={fromCoords}
                                properties={{
                                    hintContent: 'Точка отправления',
                                    balloonContent: `<b>Откуда:</b> ${from || '—'}`
                                }}
                                options={{
                                    preset: 'islands#greenDotIcon',
                                    iconColor: '#10b981'
                                }}
                            />

                            {/* Точка Б — Куда */}
                            <Placemark
                                geometry={toCoords}
                                properties={{
                                    hintContent: 'Точка назначения',
                                    balloonContent: `<b>Куда:</b> ${to || '—'}`
                                }}
                                options={{
                                    preset: 'islands#redDotIcon',
                                    iconColor: '#f43f5e'
                                }}
                            />

                            {/* Запасная полилиния если multiRouter не загрузился */}
                            <Polyline
                                geometry={[fromCoords, toCoords]}
                                options={{
                                    strokeColor: '#10b98150',
                                    strokeWidth: 4,
                                    strokeStyle: 'dash',
                                }}
                            />
                        </>
                    )}
                </Map>
            </YMaps>

            {/* Легенда маршрута */}
            {!showUserOnly && (
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    pointerEvents: 'none',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                        <span style={{ color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {from || 'Откуда не указано'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e', flexShrink: 0 }} />
                        <span style={{ color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {to || 'Куда не указано'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
