// ==============================================================================
// BIRGE WEB CLIENT — UNIFIED FASTAPI REST & WEBSOCKET CLIENT
// Единая база данных PostgreSQL + FastAPI бэкенд на Render
// ==============================================================================

export const API_URL = import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com';
const TOKEN_KEY = 'birge_token';

export const tokenStorage = {
  get: () => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const urlToken = new URLSearchParams(window.location.search).get('token');
        if (urlToken) {
          localStorage.setItem(TOKEN_KEY, urlToken);
          const cleanUrl = window.location.pathname + (window.location.hash || '');
          window.history.replaceState({}, document.title, cleanUrl);
          return urlToken;
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
    return localStorage.getItem(TOKEN_KEY);
  },
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const getCurrentUserId = () => {
  const token = tokenStorage.get();
  if (!token) return null;
  try {
    const segment = token.split('.')[1] || '';
    // JWT использует base64url, а atob понимает только base64 с padding.
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=');
    const payload = JSON.parse(atob(padded));
    return payload?.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
};

function apiError(message, status = 0) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Базовый HTTP-клиент с JWT-авторизацией и таймаутом.
 * Таймаут нужен, чтобы холодный старт Render не оставлял UI в вечном ожидании.
 */
async function authFetch(endpoint, options = {}) {
  const token = tokenStorage.get();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  let response;
  try {
    response = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (netErr) {
    if (netErr.name === 'AbortError') {
      throw apiError('Сервер не отвечает. Попробуйте ещё раз.');
    }
    throw apiError('Не удалось подключиться к серверу. Проверьте интернет-соединение.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    tokenStorage.clear();
    window.dispatchEvent(new Event('birge:unauthorized'));
    throw apiError('Сессия истекла. Войдите снова.', 401);
  }

  if (!response.ok) {
    let errorDetail = `Ошибка сервера (${response.status})`;
    try {
      const errorJson = await response.json();
      const detail = errorJson.detail ?? errorJson.message;
      if (typeof detail === 'string') {
        errorDetail = detail;
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        errorDetail = detail[0].msg;
      }
    } catch (_) {}
    throw apiError(errorDetail, response.status);
  }

  if (response.status === 204) {
    return { ok: true };
  }

  try {
    return await response.json();
  } catch (_) {
    return { ok: true };
  }
}

// Активное WebSocket-соединение для чата
let activeChatWs = null;
let activeChatTripId = null;

export const api = {
  // ─── АВТОРИЗАЦИЯ ──────────────────────────────────────────

  sendCode: async (phone) => {
    return authFetch('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyCode: async (phone, code, name = '') => {
    const data = await authFetch('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code, ...(name ? { name } : {}) }),
    });
    if (data.access_token) {
      tokenStorage.set(data.access_token);
    }
    return data;
  },

  logout: () => {
    tokenStorage.clear();
    if (activeChatWs) {
      try { activeChatWs.close(); } catch (_) {}
      activeChatWs = null;
      activeChatTripId = null;
    }
  },

  // ─── ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ────────────────────────────────

  getCurrentUser: async () => {
    if (!tokenStorage.get()) return null;
    try {
      const data = await authFetch('/users/me');
      if (!data) return null;
      return {
        id: data.id,
        uid: data.id,
        name: data.name || 'Пользователь',
        phone: data.phone || '',
        photo: data.photo || `https://i.pravatar.cc/150?u=${data.id}`,
        trust_rating: data.trust_rating ?? 5.0,
        is_verified: data.is_verified ?? false,
        trips_today: data.trips_today ?? 0,
        registered_since: data.registered_since || '2024',
        car_model: data.car_model || null,
        car_color: data.car_color || null,
        car_plate: data.car_plate || null,
        mbank_phone: data.mbank_phone || null,
        elkart_number: data.elkart_number || null,
        reviews: data.reviews || [],
      };
    } catch (e) {
      // null — только для действительно истёкшей сессии. Сетевую ошибку
      // пробрасываем, иначе холодный старт бэкенда разлогинивает пользователя.
      if (e.status === 401 || e.status === 403) return null;
      throw e;
    }
  },

  updateProfile: async (data) => {
    const res = await authFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return api.getCurrentUser();
  },

  getUserById: async (uid) => {
    if (!uid) return null;
    try {
      return await authFetch(`/users/${uid}`);
    } catch {
      return null;
    }
  },

  uploadProfilePhoto: async (photoUrl) => {
    return api.updateProfile({ photo: photoUrl });
  },

  verifyAccount: async () => {
    return authFetch('/users/me/verify', { method: 'POST' });
  },

  verifyUser: async () => api.verifyAccount(),

  // ─── ПОЕЗДКИ ──────────────────────────────────────────────

  createTrip: async (tripData) => {
    return authFetch('/trips/', {
      method: 'POST',
      body: JSON.stringify({
        role: tripData.role,
        origin: tripData.origin,
        destination: tripData.destination,
        time: tripData.time,
        date: tripData.date || null,
        seats: tripData.seats || 3,
        price_per_seat: tripData.price_per_seat || tripData.price || 0,
      }),
    });
  },

  findMatches: async (_userId, role, origin, destination, time, seats = 1, date = null) => {
    const params = new URLSearchParams({
      role,
      origin,
      destination,
      time,
      ...(date ? { date } : {}),
    });

    const list = await authFetch(`/trips/matches?${params.toString()}`);
    if (!Array.isArray(list)) return [];

    return list.map((t) => ({
      id: t.id,
      trip_id: t.id,
      role: t.role,
      from: t.origin,
      to: t.destination,
      origin: t.origin,
      destination: t.destination,
      time: t.time,
      date: t.date || null,
      seats: t.seats || 3,
      seats_taken: t.seats_taken || 0,
      price_per_seat: t.price_per_seat || 0,
      userId: t.user?.id || t.user_id,
      user_id: t.user?.id || t.user_id,
      user: {
        id: t.user?.id || t.user_id,
        name: t.user?.name || 'Пользователь',
        photo: t.user?.photo || `https://i.pravatar.cc/150?u=${t.user_id}`,
        trust_rating: t.user?.trust_rating ?? 5.0,
        is_verified: t.user?.is_verified ?? false,
        car_model: t.user?.car_model || null,
        car_plate: t.user?.car_plate || null,
        car_color: t.user?.car_color || null,
      },
    }));
  },

  getMyTrips: async () => {
    return authFetch('/users/me/trips');
  },

  getActiveTrip: async () => {
    return authFetch('/users/me/active-trip');
  },

  getScheduledTrips: async () => {
    return authFetch('/users/me/scheduled-trips');
  },

  updateTripStatus: async (tripId, status) => {
    return authFetch(`/trips/${tripId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  cancelTrip: async (tripId) => {
    return authFetch(`/trips/${tripId}`, {
      method: 'DELETE',
    });
  },

  cancelScheduledTrip: async (tripId) => api.cancelTrip(tripId),

  getTripPassengers: async (tripId) => {
    return authFetch(`/trips/${tripId}/passengers`);
  },

  getTripPayment: async (tripId) => {
    return authFetch(`/trips/${tripId}/payment`);
  },

  // ─── ЗАПРОСЫ НА ПОЕЗДКУ (TRIP REQUESTS) ──────────────────

  sendTripRequest: async (driverTripId, myTripId, driverId) => {
    return authFetch('/trip-requests/', {
      method: 'POST',
      body: JSON.stringify({
        trip_id: Number(driverTripId),
        requester_trip_id: myTripId ? Number(myTripId) : null,
        driver_id: driverId ? Number(driverId) : null,
      }),
    });
  },

  getIncomingRequests: async () => {
    return authFetch('/trip-requests/incoming/');
  },

  respondToRequest: async (requestId, action) => {
    const status = action === 'accept' ? 'accepted' : 'declined';
    return authFetch(`/trip-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  checkRequestStatus: async (tripId) => {
    return authFetch(`/trip-requests/status/${tripId}`);
  },

  subscribeIncomingRequests: (callback) => {
    let active = true;
    const poll = async () => {
      if (!active || !tokenStorage.get()) return;
      try {
        const reqs = await api.getIncomingRequests();
        if (active && Array.isArray(reqs)) callback(reqs);
      } catch (_) {}
    };

    poll();
    const interval = setInterval(poll, 3500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  subscribeRequestStatus: (tripId, callback) => {
    let active = true;
    const poll = async () => {
      if (!active || !tokenStorage.get()) return;
      try {
        const res = await api.checkRequestStatus(tripId);
        if (active && res) callback(res);
      } catch (_) {}
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  // ─── ЧАТ (WEBSOCKET + REST) ───────────────────────────────

  getTripMessages: async (tripId) => {
    const msgs = await authFetch(`/trips/${tripId}/messages`);
    if (!Array.isArray(msgs)) return [];
    return msgs.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender?.name || 'Пользователь',
      text: m.text,
      time: m.timestamp || '',
    }));
  },

  subscribeTripMessages: (tripId, callback) => {
    let active = true;
    const token = tokenStorage.get() || '';
    const userId = getCurrentUserId();
    let ws = null;
    let pollInterval = null;

    const loadHistory = async () => {
      try {
        const history = await api.getTripMessages(tripId);
        if (active) callback(history);
      } catch (_) {}
    };

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(async () => {
        if (!active) return;
        try {
          const fresh = await api.getTripMessages(tripId);
          if (active) callback(fresh);
        } catch (_) {}
      }, 3000);
    };

    loadHistory();

    if (userId && token) {
      const wsUrl = API_URL.replace(/^https/, 'wss').replace(/^http/, 'ws');
      try {
        ws = new WebSocket(`${wsUrl}/ws/chat/${tripId}/${userId}?token=${encodeURIComponent(token)}`);
        activeChatWs = ws;
        activeChatTripId = tripId;

        ws.onmessage = async () => {
          if (!active) return;
          try {
            const all = await api.getTripMessages(tripId);
            if (active) callback(all);
          } catch (_) {}
        };
        ws.onerror = startPolling;
        ws.onclose = () => {
          if (activeChatWs === ws) {
            activeChatWs = null;
            activeChatTripId = null;
          }
          // Сокет закрылся штатно (рестарт сервера) — polling продолжит работу.
          if (active) startPolling();
        };
      } catch (_) {
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
      if (ws) {
        try { ws.close(); } catch (_) {}
        if (activeChatWs === ws) {
          activeChatWs = null;
          activeChatTripId = null;
        }
      }
    };
  },

  sendChatMessage: async (tripId, text) => {
    const trimmed = text?.trim();
    if (!trimmed) return null;
    // Отправляем через REST: сервер сохранит сообщение и разошлёт его
    // по WebSocket. Так сообщение не теряется при медленном соединении.
    return authFetch(`/trips/${tripId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: trimmed }),
    });
  },

  // ─── ОТЗЫВЫ И БЕЗОПАСНОСТЬ ────────────────────────────────

  submitReview: async (userId, rating, text, tripId = null) => {
    return authFetch('/reviews/', {
      method: 'POST',
      body: JSON.stringify({
        user_id: Number(userId),
        rating: Number(rating),
        text: text || '',
        ...(tripId ? { trip_id: Number(tripId) } : {}),
      }),
    });
  },

  sendPanic: async (tripId) => {
    try {
      return await authFetch(`/trips/${tripId}/panic`, { method: 'POST' });
    } catch (e) {
      console.error('[sendPanic]', e);
      return { sent: false, reason: e.message };
    }
  },

  registerPushToken: async (_token) => {
    return { ok: true };
  },
};
