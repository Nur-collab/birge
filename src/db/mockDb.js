// Имитация базы данных для приложения Birge

export const users = [
    {
        id: 'u1',
        name: 'Азамат',
        phone: '+996 555 123 456',
        photo: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        trustRating: 4.8,
        isVerified: true,
        tripsToday: 1, // Лимит 3 для водителей
        reviews: [
            { id: 'r1', author: 'Айнура', text: 'Отличный водитель, приехал вовремя!', rating: 5 },
            { id: 'r2', author: 'Бекзат', text: 'Аккуратное вождение.', rating: 4 }
        ],
        registeredSince: '2022'
    },
    {
        id: 'u2',
        name: 'Айнура',
        phone: '+996 777 987 654',
        photo: 'https://i.pravatar.cc/150?u=a04258114e29026702d',
        trustRating: 4.9,
        isVerified: true,
        tripsToday: 0,
        reviews: [
            { id: 'r3', author: 'Азамат', text: 'Приятная попутчица.', rating: 5 }
        ],
        registeredSince: '2023'
    },
    {
        id: 'u3',
        name: 'Тимур',
        phone: '+996 500 111 222',
        photo: 'https://i.pravatar.cc/150?u=a04258114e29026302d',
        trustRating: 4.5,
        isVerified: false,
        tripsToday: 3, // Достиг лимита
        reviews: [],
        registeredSince: '2024'
    }
];

export const trips = [
    {
        id: 't1',
        userId: 'u1',
        role: 'driver',
        from: 'Жилмассив Ала-Арча',
        to: 'ЦУМ (Центр)',
        time: '08:00',
        seatsAvailable: 3,
        status: 'active'
    },
    {
        id: 't2',
        userId: 'u2',
        role: 'passenger',
        from: 'Жилмассив Ала-Арча (Народный)',
        to: 'ЦУМ (Центр)',
        time: '08:15',
        seatsAvailable: 0,
        status: 'active'
    }
];

// Текущий авторизованный пользователь (Мок)
export const currentUser = users[0];
