// ============================================================
// BIRGE — Firebase API Layer
// Полная замена REST API (Render/FastAPI) на Firebase SDK
// ============================================================

import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions, auth } from '../firebase';

// ─── Helpers ────────────────────────────────────────────────

const currentFbUser = () => auth.currentUser;
const userDoc = (uid) => doc(db, 'users', uid);

export const getCurrentUserId = () => currentFbUser()?.uid || null;

// ─── USERS ──────────────────────────────────────────────────

export const api = {

  /** Получить профиль текущего пользователя */
  getCurrentUser: async () => {
    const user = currentFbUser();
    if (!user) return null;
    try {
      const snap = await getDoc(userDoc(user.uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      const reviewsSnap = await getDocs(
        query(collection(db, 'users', user.uid, 'reviews'), orderBy('createdAt', 'desc'))
      );
      const reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      return {
        id: user.uid,
        uid: user.uid,
        name: data.name || '',
        phone: data.phone || user.phoneNumber || '',
        photo: data.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        trust_rating: data.trustRating ?? 5.0,
        is_verified: data.isVerified ?? false,
        trips_today: data.tripsToday ?? 0,
        registered_since: data.registeredSince || new Date().getFullYear().toString(),
        car_model: data.carModel || null,
        car_color: data.carColor || null,
        car_plate: data.carPlate || null,
        mbank_phone: data.mbankPhone || null,
        elkart_number: data.elkartNumber || null,
        reviews,
      };
    } catch (e) {
      console.error('[api.getCurrentUser]', e);
      return null;
    }
  },

  /** Обновить профиль */
  updateProfile: async (data) => {
    const user = currentFbUser();
    if (!user) throw new Error('Not authenticated');
    const mapped = {
      ...(data.name          !== undefined && { name: data.name }),
      ...(data.photo         !== undefined && { photoURL: data.photo }),
      ...(data.car_model     !== undefined && { carModel: data.car_model }),
      ...(data.car_color     !== undefined && { carColor: data.car_color }),
      ...(data.car_plate     !== undefined && { carPlate: data.car_plate }),
      ...(data.mbank_phone   !== undefined && { mbankPhone: data.mbank_phone }),
      ...(data.elkart_number !== undefined && { elkartNumber: data.elkart_number }),
    };
    await updateDoc(userDoc(user.uid), mapped);
    return api.getCurrentUser();
  },

  /** Получить публичные данные пользователя по uid */
  getUserById: async (uid) => {
    if (!uid) return null;
    try {
      const snap = await getDoc(userDoc(uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: uid,
        name: data.name || '',
        phone: data.phone || '',
        photo: data.photoURL || `https://i.pravatar.cc/150?u=${uid}`,
        trust_rating: data.trustRating ?? 5.0,
        is_verified: data.isVerified ?? false,
        car_model: data.carModel || null,
        car_color: data.carColor || null,
        car_plate: data.carPlate || null,
        mbank_phone: data.mbankPhone || null,
        elkart_number: data.elkartNumber || null,
      };
    } catch (e) {
      console.error('[api.getUserById]', e);
      return null;
    }
  },

  /** Загрузить фото профиля в Firebase Storage */
  uploadProfilePhoto: async (file) => {
    const user = currentFbUser();
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop();
    const storageRef = ref(storage, `users/${user.uid}/photo.${ext}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateDoc(userDoc(user.uid), { photoURL: url });
    return url;
  },

  /** История поездок */
  getMyTrips: async () => {
    const user = currentFbUser();
    if (!user) return [];
    const snap = await getDocs(
      query(
        collection(db, 'trips'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
    );
    return snap.docs.map(d => _mapTrip(d));
  },

  /** Запланированные поездки */
  getScheduledTrips: async () => {
    const user = currentFbUser();
    if (!user) return [];
    const today = new Date().toISOString().slice(0, 10);

    const [driverSnap, passengerReqSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'trips'),
        where('userId', '==', user.uid),
        where('role', '==', 'driver'),
        where('status', '==', 'scheduled'),
        where('date', '>', today)
      )),
      getDocs(query(
        collection(db, 'trip_requests'),
        where('requesterId', '==', user.uid),
        where('status', '==', 'accepted')
      )),
    ]);

    const result = [];

    for (const d of driverSnap.docs) {
      const trip = { id: d.id, ...d.data() };
      const acceptedReqs = await getDocs(query(
        collection(db, 'trip_requests'),
        where('tripId', '==', d.id),
        where('status', '==', 'accepted')
      ));
      const passengers = [];
      for (const r of acceptedReqs.docs) {
        const req = r.data();
        const pasSnap = await getDoc(userDoc(req.requesterId));
        if (pasSnap.exists()) {
          const pas = pasSnap.data();
          passengers.push({
            id: req.requesterId,
            name: pas.name,
            photo: pas.photoURL,
            trust_rating: pas.trustRating ?? 5.0,
            is_verified: pas.isVerified ?? false,
            request_id: r.id,
          });
        }
      }
      result.push({
        trip_id: d.id,
        role: 'driver',
        origin: trip.origin,
        destination: trip.destination,
        date: trip.date,
        time: trip.time,
        seats: trip.seats || 3,
        seats_taken: trip.seatsTaken || 0,
        passengers,
        driver: null,
      });
    }

    for (const r of passengerReqSnap.docs) {
      const req = r.data();
      const tripSnap = await getDoc(doc(db, 'trips', req.tripId));
      if (!tripSnap.exists()) continue;
      const trip = tripSnap.data();
      if (!trip.date || trip.date <= today) continue;
      const driverSnap2 = await getDoc(userDoc(req.driverId));
      const driver = driverSnap2.exists() ? driverSnap2.data() : null;
      result.push({
        trip_id: req.tripId,
        requester_trip_id: req.requesterTripId,
        role: 'passenger',
        origin: trip.origin,
        destination: trip.destination,
        date: trip.date,
        time: trip.time,
        seats: trip.seats || 3,
        seats_taken: trip.seatsTaken || 0,
        passengers: [],
        driver: driver ? {
          id: req.driverId,
          name: driver.name,
          photo: driver.photoURL,
          trust_rating: driver.trustRating ?? 5.0,
          is_verified: driver.isVerified ?? false,
          car_model: driver.carModel || null,
          car_color: driver.carColor || null,
          car_plate: driver.carPlate || null,
        } : null,
      });
    }

    result.sort((a, b) => (a.date + a.time) > (b.date + b.time) ? 1 : -1);
    return result;
  },

  // ─── TRIPS ────────────────────────────────────────────────

  createTrip: async (tripData) => {
    const user = currentFbUser();
    if (!user) throw new Error('Not authenticated');
    const today = new Date().toISOString().slice(0, 10);
    const isScheduled = tripData.date && tripData.date > today;

    if (tripData.role === 'driver') {
      const userSnap = await getDoc(userDoc(user.uid));
      const userData = userSnap.data() || {};
      const tripsToday = userData.lastTripDate === today ? (userData.tripsToday || 0) : 0;
      if (tripsToday >= 3) throw new Error('Daily driver trip limit (3) exceeded');
      await updateDoc(userDoc(user.uid), { tripsToday: tripsToday + 1, lastTripDate: today });
    }

    const docRef = await addDoc(collection(db, 'trips'), {
      userId: user.uid,
      role: tripData.role,
      origin: tripData.origin,
      destination: tripData.destination,
      time: tripData.time,
      date: tripData.date || null,
      status: isScheduled ? 'scheduled' : 'active',
      seats: tripData.seats || 3,
      seatsTaken: 0,
      pricePerSeat: tripData.price_per_seat || 0,
      reminderSent: false,
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id, ...tripData, status: isScheduled ? 'scheduled' : 'active' };
  },

  cancelTrip: async (tripId) => {
    const user = currentFbUser();
    if (!user) return;
    const tripRef = doc(db, 'trips', tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists() || snap.data().userId !== user.uid) return;
    await deleteDoc(tripRef);
    return { id: tripId, deleted: true };
  },

  cancelScheduledTrip: async (tripId) => api.cancelTrip(tripId),

  updateTripStatus: async (tripId, status) => {
    const user = currentFbUser();
    if (!user) return;
    const tripRef = doc(db, 'trips', tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) return;
    const trip = snap.data();

    if (status === 'passenger_cancelled') {
      const reqSnap = await getDocs(query(
        collection(db, 'trip_requests'),
        where('tripId', '==', tripId),
        where('requesterId', '==', user.uid),
        where('status', '==', 'accepted')
      ));
      for (const r of reqSnap.docs) await updateDoc(r.ref, { status: 'cancelled' });
      await updateDoc(tripRef, { seatsTaken: Math.max(0, (trip.seatsTaken || 0) - 1) });
      return { id: tripId, status: 'passenger_cancelled' };
    }

    if (status === 'completed' && trip.userId !== user.uid) {
      return { id: tripId, status: 'passenger_completed' };
    }
    if (trip.userId !== user.uid) throw new Error('Only driver can change status');
    await updateDoc(tripRef, { status });
    return { id: tripId, status };
  },

  getActiveTrip: async () => {
    const user = currentFbUser();
    if (!user) return { found: false };
    const today = new Date().toISOString().slice(0, 10);
    // 1. Поездка, созданная текущим пользователем
    const snap = await getDocs(query(
      collection(db, 'trips'),
      where('userId', '==', user.uid),
      where('status', 'in', ['active', 'matched', 'in_progress']),
      where('date', '==', today),
      limit(1)
    ));
    if (!snap.empty) {
      const d = snap.docs[0];
      const t = d.data();
      return { found: true, trip_id: d.id, role: t.role, my_role: t.role, is_driver: t.role === 'driver', origin: t.origin, destination: t.destination, time: t.time, date: t.date, seats: t.seats || 3 };
    }
    // 2. Поездка водителя, где текущий пользователь принят как пассажир
    const reqSnap = await getDocs(query(
      collection(db, 'trip_requests'),
      where('requesterId', '==', user.uid),
      where('status', '==', 'accepted'),
      limit(1)
    ));
    if (!reqSnap.empty) {
      const req = reqSnap.docs[0].data();
      if (req.tripId) {
        const tripSnap = await getDoc(doc(db, 'trips', req.tripId));
        if (tripSnap.exists()) {
          const t = tripSnap.data();
          if (['active', 'matched', 'in_progress'].includes(t.status)) {
            return { found: true, trip_id: tripSnap.id, role: 'passenger', my_role: 'passenger', is_driver: false, origin: t.origin, destination: t.destination, time: t.time, date: t.date, seats: t.seats || 3, driverId: t.userId };
          }
        }
      }
    }
    return { found: false };
  },

  /** Найти совпадения — клиентский Haversine напрямую через Firestore */
  findMatches: async (_userId, role, origin, destination, time, seats = 1, date = null) => {
    const user = currentFbUser();
    if (!user) return [];

    const LOCATIONS = {
      'ала-арча':[42.838,74.552],'ала арча':[42.838,74.552],'аламедин':[42.87,74.52],
      'джал':[42.82,74.57],'кара-жыгач':[42.865,74.505],'кара жыгач':[42.865,74.505],
      'асанбай':[42.845,74.63],'тунгуч':[42.892,74.598],'восток-5':[42.875,74.61],
      'восток 5':[42.875,74.61],'мкр 7':[42.855,74.565],'мкр. 7':[42.855,74.565],
      'ак-орго':[42.86,74.53],'ак орго':[42.86,74.53],'кожомкул':[42.85,74.51],
      'деревня':[42.885,74.62],'кеминчи':[42.895,74.56],'бай тюбе':[42.83,74.59],
      'байтюбе':[42.83,74.59],'новпостройка':[42.865,74.58],
      'цум':[42.876,74.605],'центр':[42.8746,74.5698],'площадь':[42.8762,74.6036],
      'ала-тоо':[42.8762,74.6036],'ала тоо':[42.8762,74.6036],'ошский базар':[42.882,74.578],
      'ошский':[42.882,74.578],'дордой':[42.91,74.63],'кузнечная':[42.878,74.585],
      'карпинка':[42.867,74.601],'рушания':[42.89,74.57],'горький парк':[42.882,74.598],
      'фучик':[42.88,74.59],'ботанический сад':[42.885,74.582],'октябрьская':[42.873,74.595],
      'меркентиль':[42.894,74.594],'манас':[42.8474,74.4776],'аэропорт':[42.8474,74.4776],
      'западный автовокзал':[42.87,74.55],'западный':[42.87,74.55],
      'восточный автовокзал':[42.878,74.64],
    };

    const haversine = (a, b) => {
      const R = 6371, dLat = (b[0]-a[0])*Math.PI/180, dLon = (b[1]-a[1])*Math.PI/180;
      const x = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2;
      return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
    };
    const inRadius = (a, b) => {
      const ca = LOCATIONS[a?.toLowerCase()], cb = LOCATIONS[b?.toLowerCase()];
      return ca && cb ? haversine(ca, cb) <= 2.0 : a?.toLowerCase() === b?.toLowerCase();
    };
    const toMin = (t) => { try { const [h,m]=t.split(':'); return +h*60+ +m; } catch{return null;} };
    const inTime = (a, b) => { const ma=toMin(a),mb=toMin(b); return ma!=null&&mb!=null&&Math.abs(ma-mb)<=30; };

    const targetRole = role === 'driver' ? 'passenger' : 'driver';
    const snap = await getDocs(query(
      collection(db, 'trips'),
      where('role', '==', targetRole),
      where('status', 'in', ['active', 'scheduled'])
    ));

    const matches = [];
    for (const d of snap.docs) {
      const t = d.data();
      if (t.userId === user.uid) continue;
      if (date && t.date && t.date !== date) continue;
      if (!inRadius(origin, t.origin)) continue;
      if (!inRadius(destination, t.destination)) continue;
      if (!inTime(time, t.time)) continue;

      let userData = {};
      try {
        const uSnap = await getDoc(userDoc(t.userId));
        if (uSnap.exists()) {
          const u = uSnap.data();
          userData = {
            name: u.name,
            photoURL: u.photoURL,
            trustRating: u.trustRating,
            isVerified: u.isVerified,
            carModel: u.carModel,
            carPlate: u.carPlate,
            carColor: u.carColor,
            mbankPhone: u.mbankPhone,
            elkartNumber: u.elkartNumber,
          };
        }
      } catch (_) {}

      matches.push({
        id: d.id, role: t.role,
        from: t.origin, to: t.destination, origin: t.origin, destination: t.destination,
        time: t.time, date: t.date || null, price_per_seat: t.pricePerSeat || 0,
        userId: t.userId, user_id: t.userId,
        user: {
          id: t.userId,
          name: userData.name || 'Пользователь',
          photo: userData.photoURL || `https://i.pravatar.cc/150?u=${t.userId}`,
          trust_rating: userData.trustRating ?? 5.0,
          is_verified: userData.isVerified ?? false,
          car_model: userData.carModel || null,
          car_plate: userData.carPlate || null,
          car_color: userData.carColor || null,
          mbank_phone: userData.mbankPhone || null,
          elkart_number: userData.elkartNumber || null,
        },
      });
    }
    return matches;
  },

  getTripPassengers: async (tripId) => {
    const acceptedSnap = await getDocs(query(
      collection(db, 'trip_requests'),
      where('tripId', '==', tripId),
      where('status', '==', 'accepted')
    ));
    const tripSnap = await getDoc(doc(db, 'trips', tripId));
    if (!tripSnap.exists()) return { passengers: [], seats: 3, seats_taken: 0 };
    const trip = tripSnap.data();
    const passengers = [];
    for (const r of acceptedSnap.docs) {
      const req = r.data();
      const uSnap = await getDoc(userDoc(req.requesterId));
      if (uSnap.exists()) {
        const u = uSnap.data();
        passengers.push({ id: req.requesterId, name: u.name, photo: u.photoURL, trust_rating: u.trustRating ?? 5.0, is_verified: u.isVerified ?? false, request_id: r.id });
      }
    }
    return { trip_id: tripId, seats: trip.seats || 3, seats_taken: trip.seatsTaken || 0, passengers };
  },

  getTripMessages: async (tripId) => {
    const snap = await getDocs(query(collection(db, 'trips', tripId, 'messages'), orderBy('createdAt', 'asc')));
    return snap.docs.map(d => {
      const m = d.data();
      return { id: d.id, sender_id: m.senderId, text: m.text, timestamp: m.timestamp || '', sender: { name: m.senderName } };
    });
  },

  /** Подписка на сообщения чата в реальном времени (заменяет WebSocket) */
  subscribeTripMessages: (tripId, callback) => {
    return onSnapshot(
      query(collection(db, 'trips', tripId, 'messages'), orderBy('createdAt', 'asc')),
      (snap) => callback(snap.docs.map(d => {
        const m = d.data();
        return { id: d.id, senderId: m.senderId, senderName: m.senderName, text: m.text, time: m.timestamp || '' };
      }))
    );
  },

  sendChatMessage: async (tripId, text) => {
    const user = currentFbUser();
    if (!user || !tripId || !text.trim()) return;
    const uSnap = await getDoc(userDoc(user.uid));
    const senderName = uSnap.exists() ? uSnap.data().name : 'Пользователь';
    const timestamp = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    await addDoc(collection(db, 'trips', tripId, 'messages'), {
      senderId: user.uid,
      senderName,
      text: text.trim(),
      timestamp,
      createdAt: serverTimestamp(),
    });
  },

  // ─── TRIP REQUESTS ────────────────────────────────────────

  sendTripRequest: async (tripId, requesterTripId, driverId) => {
    const user = currentFbUser();
    if (!user) throw new Error('Not authenticated');
    const existing = await getDocs(query(
      collection(db, 'trip_requests'),
      where('tripId', '==', tripId),
      where('requesterId', '==', user.uid),
      where('status', '==', 'pending')
    ));
    if (!existing.empty) return { id: existing.docs[0].id, status: 'pending' };
    const docRef = await addDoc(collection(db, 'trip_requests'), {
      tripId,
      requesterTripId: requesterTripId || null,
      requesterId: user.uid,
      driverId,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, status: 'pending' };
  },

  respondToRequest: async (requestId, action) => {
    const user = currentFbUser();
    if (!user) throw new Error('Not authenticated');
    const reqRef = doc(db, 'trip_requests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) throw new Error('Request not found');
    const req = reqSnap.data();
    if (req.driverId !== user.uid) throw new Error('Access denied');
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await updateDoc(reqRef, { status: newStatus });

    if (newStatus === 'accepted') {
      const tripRef = doc(db, 'trips', req.tripId);
      const tripSnap = await getDoc(tripRef);
      if (tripSnap.exists()) {
        const trip = tripSnap.data();
        const newTaken = (trip.seatsTaken || 0) + 1;
        const updates = { seatsTaken: newTaken };
        if (newTaken >= (trip.seats || 3)) updates.status = 'matched';
        await updateDoc(tripRef, updates);
      }
    }
    const driverSnap = await getDoc(userDoc(user.uid));
    const driver = driverSnap.data() || {};
    return { id: requestId, status: newStatus, trip_id: req.tripId, requester_trip_id: req.requesterTripId, driver_name: driver.name, driver_photo: driver.photoURL, driver_car_model: driver.carModel, driver_car_plate: driver.carPlate, driver_car_color: driver.carColor };
  },

  getIncomingRequests: async () => {
    const user = currentFbUser();
    if (!user) return [];
    const snap = await getDocs(query(collection(db, 'trip_requests'), where('driverId', '==', user.uid), where('status', '==', 'pending')));
    const result = [];
    for (const r of snap.docs) {
      const req = r.data();
      const [requesterSnap, tripSnap] = await Promise.all([getDoc(userDoc(req.requesterId)), getDoc(doc(db, 'trips', req.tripId))]);
      const requester = requesterSnap.exists() ? requesterSnap.data() : {};
      const trip = tripSnap.exists() ? tripSnap.data() : {};
      result.push({ id: r.id, trip_id: req.tripId, requester_trip_id: req.requesterTripId, requester_id: req.requesterId, requester_name: requester.name || 'Пассажир', requester_photo: requester.photoURL || '', requester_rating: requester.trustRating ?? 5.0, origin: trip.origin || '', destination: trip.destination || '', time: trip.time || '', date: trip.date || '', status: req.status });
    }
    return result;
  },

  /** Подписка на входящие запросы (заменяет SSE для водителя) */
  subscribeIncomingRequests: (callback) => {
    const user = currentFbUser();
    if (!user) return () => {};
    return onSnapshot(
      query(collection(db, 'trip_requests'), where('driverId', '==', user.uid), where('status', '==', 'pending')),
      async (snap) => {
        const result = [];
        for (const r of snap.docs) {
          const req = r.data();
          const [requesterSnap, tripSnap] = await Promise.all([getDoc(userDoc(req.requesterId)), getDoc(doc(db, 'trips', req.tripId))]);
          const requester = requesterSnap.exists() ? requesterSnap.data() : {};
          const trip = tripSnap.exists() ? tripSnap.data() : {};
          result.push({ id: r.id, trip_id: req.tripId, requester_trip_id: req.requesterTripId, requester_id: req.requesterId, requester_name: requester.name || 'Пассажир', requester_photo: requester.photoURL || '', requester_rating: requester.trustRating ?? 5.0, origin: trip.origin || '', destination: trip.destination || '', time: trip.time || '', date: trip.date || '', status: req.status, seats: trip.seats || 3 });
        }
        callback(result);
      }
    );
  },

  /** Подписка на статус запроса пассажира (заменяет SSE для пассажира) */
  subscribeRequestStatus: (tripId, callback) => {
    const user = currentFbUser();
    if (!user) return () => {};
    return onSnapshot(
      query(collection(db, 'trip_requests'), where('tripId', '==', tripId), where('requesterId', '==', user.uid), limit(1)),
      async (snap) => {
        if (snap.empty) return callback({ status: 'not_sent' });
        const r = snap.docs[0];
        const req = r.data();
        const driverSnap = await getDoc(userDoc(req.driverId));
        const driver = driverSnap.exists() ? driverSnap.data() : {};
        callback({ id: r.id, status: req.status, trip_id: req.tripId, requester_trip_id: req.requesterTripId, driver_id: req.driverId, driver_name: driver.name || null, driver_photo: driver.photoURL || null, driver_car_model: driver.carModel || null, driver_car_plate: driver.carPlate || null, driver_car_color: driver.carColor || null });
      }
    );
  },

  // ─── REVIEWS ──────────────────────────────────────────────

  /** Отзыв — запись напрямую в Firestore + пересчитаем рейтинг на клиенте */
  submitReview: async (userId, rating, text) => {
    const user = currentFbUser();
    if (!user) throw new Error('Not authenticated');
    if (user.uid === userId) throw new Error('Нельзя оценивать себя');

    // Проверяем дубликат
    const existingSnap = await getDocs(query(
      collection(db, 'users', userId, 'reviews'),
      where('authorUid', '==', user.uid), limit(1)
    ));
    if (!existingSnap.empty) throw new Error('Вы уже оставляли отзыв');

    const authorSnap = await getDoc(userDoc(user.uid));
    const authorName = authorSnap.exists() ? authorSnap.data().name : 'Пользователь';

    const reviewRef = await addDoc(collection(db, 'users', userId, 'reviews'), {
      authorUid: user.uid, authorName, rating: Number(rating), text,
      createdAt: serverTimestamp(),
    });

    // Пересчитываем средний рейтинг
    const allReviews = await getDocs(collection(db, 'users', userId, 'reviews'));
    const ratings = allReviews.docs.map(d => d.data().rating || 0);
    const avg = ratings.length ? Math.round((ratings.reduce((a,b)=>a+b,0)/ratings.length)*100)/100 : rating;
    await updateDoc(userDoc(userId), { trustRating: avg });

    return { id: reviewRef.id, newTrustRating: avg };
  },

  // ─── PANIC ────────────────────────────────────────────────

  /** Кнопка тревоги — через защищённый бэкенд API */
  sendPanic: async (tripId) => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com';
    const token = localStorage.getItem('birge_token') || '';
    try {
      const res = await fetch(`${API_URL}/trips/${tripId}/panic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      return { sent: Boolean(data?.sent) };
    } catch (e) {
      console.error('[sendPanic]', e);
      return { sent: false };
    }
  },

  // ─── PUSH TOKEN ───────────────────────────────────────────

  registerPushToken: async (token) => {
    const user = currentFbUser();
    if (!user || !token) return;
    try {
      await setDoc(doc(db, 'push_tokens', user.uid), { token, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error('[api.registerPushToken]', e);
    }
  },

  /** Проверить верификацию через Telegram и вернуть статус или ссылку на бота */
  verifyAccount: async () => {
    const user = currentFbUser();
    if (!user) return { status: 'error', message: 'Требуется авторизация' };
    try {
      const uSnap = await getDoc(userDoc(user.uid));
      if (!uSnap.exists()) return { status: 'error', message: 'Профиль не найден' };
      const uData = uSnap.data();
      const rawPhone = uData.phone || user.phoneNumber || '';
      const phoneDigits = rawPhone.replace(/\D/g, '');

      // Проверяем наличие привязки в telegram_bindings (по digits)
      if (phoneDigits) {
        const bSnap = await getDoc(doc(db, 'telegram_bindings', phoneDigits));
        if (bSnap.exists() && bSnap.data().chatId) {
          await updateDoc(userDoc(user.uid), {
            isVerified: true,
            telegramChatId: bSnap.data().chatId,
          });
          return {
            status: 'verified',
            message: '✅ Аккаунт успешно подтверждён через Telegram!',
          };
        }
      }

      // Если в профиле уже есть флаг
      if (uData.isVerified) {
        return { status: 'verified', message: '✅ Аккаунт уже верифицирован!' };
      }

      // Если не привязан — даём ссылку на бота с deep-link параметром
      const botUrl = `https://t.me/BirgeAuthBot?start=${phoneDigits}`;
      return {
        status: 'need_telegram',
        bot_url: botUrl,
        message: 'Для получения галочки ✅ откройте бота @BirgeAuthBot и нажмите СТАРТ.',
      };
    } catch (e) {
      console.error('[api.verifyAccount]', e);
      return { status: 'error', message: 'Ошибка при проверке Telegram. Попробуйте позже.' };
    }
  },

  verifyUser: async () => api.verifyAccount(),
};

function _mapTrip(docSnap) {
  const d = docSnap.data();
  return { id: docSnap.id, user_id: d.userId, role: d.role, origin: d.origin, destination: d.destination, time: d.time, date: d.date || null, status: d.status, seats: d.seats || 3, seats_taken: d.seatsTaken || 0, price_per_seat: d.pricePerSeat || 0 };
}

export const API_URL = '';
