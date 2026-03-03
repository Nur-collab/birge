const API_URL = 'http://localhost:8000';

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
        if (!response.ok) throw new Error('Ошибка отправки кода');
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

    findMatches: async (userId, role, origin, destination, time) => {
        try {
            const params = new URLSearchParams({ user_id: userId, role, origin, destination, time });
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

    submitReview: async (userId, authorName, rating, text) => {
        try {
            const response = await fetch(`${API_URL}/reviews/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ user_id: userId, author_name: authorName, rating, text }),
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('submitReview error:', e);
            return null;
        }
    },
};
