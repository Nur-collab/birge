export const API_URL = import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com';

const getAuthHeader = () => {
    const token = localStorage.getItem('birge_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
    // --- AUTH ---
    sendCode: async (phone) => {
        const response = await fetch(`${API_URL}/auth/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Ошибка отправки кода');
        }
        return await response.json();
    },

    verifyCode: async (phone, code, name) => {
        const response = await fetch(`${API_URL}/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, code, name }),
        });
        if (!response.ok) throw new Error('Неверный код');
        return await response.json();
    },

    // --- USER ---
    getCurrentUser: async () => {
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                headers: { ...getAuthHeader() }
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    updateProfile: async (userData) => {
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify(userData),
            });
            if (!response.ok) throw new Error('Failed to update profile');
            return await response.json();
        } catch (e) {
            console.error('updateProfile error:', e);
            throw e;
        }
    },

    getMyTrips: async () => {
        try {
            const response = await fetch(`${API_URL}/users/me/trips`, {
                headers: { ...getAuthHeader() }
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error('getMyTrips error:', e);
            return [];
        }
    },

    // --- TRIPS ---
    createTrip: async (tripData) => {
        const response = await fetch(`${API_URL}/trips/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(tripData),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Network error');
        }
        return await response.json();
    },

    findMatches: async (userId, role, origin, destination, time, seats = 1, date = null) => {
        try {
            const params = new URLSearchParams({ user_id: userId, role, origin, destination, time });
            if (date) params.append('date', date);
            const response = await fetch(`${API_URL}/trips/matches?${params}`, {
                headers: { ...getAuthHeader() }
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    getTripPassengers: async (tripId) => {
        try {
            const response = await fetch(`${API_URL}/trips/${tripId}/passengers`, {
                headers: { ...getAuthHeader() }
            });
            if (!response.ok) return { passengers: [], seats: 3, seats_taken: 0 };
            return await response.json();
        } catch (e) {
            console.error('getTripPassengers error:', e);
            return { passengers: [], seats: 3, seats_taken: 0 };
        }
    },

    getTripMessages: async (tripId) => {
        try {
            const response = await fetch(`${API_URL}/trips/${tripId}/messages`, {
                headers: { ...getAuthHeader() }
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    updateTripStatus: async (tripId, status) => {
        try {
            await fetch(`${API_URL}/trips/${tripId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ status }),
            });
        } catch (e) {
            console.error('updateTripStatus error:', e);
        }
    },

    cancelTrip: async (tripId) => {
        try {
            await fetch(`${API_URL}/trips/${tripId}`, {
                method: 'DELETE',
                headers: { ...getAuthHeader() },
            });
        } catch (e) {
            console.error('cancelTrip error:', e);
        }
    },

    getScheduledTrips: async () => {
        try {
            const response = await fetch(`${API_URL}/users/me/scheduled-trips`, {
                headers: { ...getAuthHeader() }
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error('getScheduledTrips error:', e);
            return [];
        }
    },

    cancelScheduledTrip: async (tripId) => {
        try {
            await fetch(`${API_URL}/trips/${tripId}`, {
                method: 'DELETE',
                headers: { ...getAuthHeader() },
            });
            return true;
        } catch (e) {
            console.error('cancelScheduledTrip error:', e);
            return false;
        }
    },

    submitReview: async (userId, rating, text) => {
        try {
            const response = await fetch(`${API_URL}/reviews/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                // author_name берётся из JWT на бэкенде — не передаём
                body: JSON.stringify({ user_id: userId, rating, text }),
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('submitReview error:', e);
            return null;
        }
    },

    verifyAccount: async () => {
        try {
            const response = await fetch(`${API_URL}/users/me/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('verifyAccount error:', e);
            return null;
        }
    },

    sendPanic: async (tripId) => {
        /** Тревожная кнопка — отправляет уведомление в Telegram поддержки. */
        try {
            const response = await fetch(`${API_URL}/trips/${tripId}/panic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('sendPanic error:', e);
            return null;
        }
    },
};
