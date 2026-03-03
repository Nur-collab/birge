import { trips, users } from '../db/mockDb';

/**
 * Проверяем, может ли водитель создать поездку (лимит 3 в день)
 */
export const canCreateTrip = (user) => {
    return user.tripsToday < 3;
};

/**
 * Моковый алгоритм сопоставления попутчиков.
 * Ищет поездки с противоположной ролью, у которых близкие точки и время (до 30 мин разница).
 */
export const findMatches = (myTrip) => {
    return trips.filter(trip => {
        // Не предлагаем себя
        if (trip.userId === myTrip.userId) return false;

        // Ищем противоположную роль (Водителю - пассажиров, Пассажиру - водителей)
        if (trip.role === myTrip.role) return false;

        // В реальном приложении здесь будет расчет расстояния по координатам.
        // Пока делаем текстовое сравнение (или просто считаем что все из одного жилмассива).
        const fromMatch = trip.from.includes('Ала-Арча') && myTrip.from.includes('Ала-Арча');
        const toMatch = trip.to.includes('ЦУМ') && myTrip.to.includes('ЦУМ');

        if (!fromMatch || !toMatch) return false;

        // Сравнение времени (простая логика для мока: совпадает час, разница минут < 30)
        const [myHour, myMin] = myTrip.time.split(':').map(Number);
        const [tHour, tMin] = trip.time.split(':').map(Number);

        if (myHour !== tHour) return false;

        const timeDiff = Math.abs(myMin - tMin);
        if (timeDiff > 30) return false;

        return true; // Мэтч! > 80% совпадения
    }).map(trip => {
        // Прикрепляем инфу о пользователе
        const user = users.find(u => u.id === trip.userId);
        return { ...trip, user };
    });
};
