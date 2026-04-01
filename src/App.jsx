import React, { useState, useEffect, useCallback } from 'react';
import { Home, Users, Map, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Dashboard from './screens/Dashboard';
import Matches from './screens/Matches';
import Trip from './screens/Trip';
import Profile from './screens/Profile';
import Settings from './screens/Settings';
import TripHistory from './screens/TripHistory';
import Login from './screens/Login';
import InstallPWA from './components/InstallPWA';
import PushNotification from './components/PushNotification';
import ReviewModal from './components/ReviewModal';
import TripRequestModal from './components/TripRequestModal';
import { api } from './utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com';

// --- Helpers для localStorage persistence ---
const TRIP_STORAGE_KEY = 'birge_active_trip';
const saveTrip = (trip) => trip
  ? localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(trip))
  : localStorage.removeItem(TRIP_STORAGE_KEY);
const loadTrip = () => {
  try { return JSON.parse(localStorage.getItem(TRIP_STORAGE_KEY)); }
  catch { return null; }
};

function App() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('birge_token'));
  const [activeTab, setActiveTab] = useState(() => {
    // Восстанавливаем таб — если была активная поездка, переходим сразу на неё
    return loadTrip() ? 'trip' : 'home';
  });
  const [matches, setMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTrip, setActiveTripState] = useState(loadTrip);
  const [notification, setNotification] = useState({ show: false, title: '', message: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [myTripId, setMyTripId] = useState(null); // ID поездки текущего пользователя
  const [incomingRequest, setIncomingRequest] = useState(null); // для водителя
  const [pendingRequestCount, setPendingRequestCount] = useState(0); // badge для водителя
  const seenRequestIds = React.useRef(new Set()); // чтобы не показывать один и тот же запрос дважды

  // Обёртка setActiveTrip — автоматически пишет/очищает localStorage
  const setActiveTrip = useCallback((trip) => {
    setActiveTripState(trip);
    saveTrip(trip);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let attempts = 0;
    const maxAttempts = 5;

    const tryLoad = async () => {
      const user = await api.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          // Бэкенд ещё грузится (Render cold start) — повторим через 3с
          setTimeout(tryLoad, 3000);
        } else {
          // После 5 попыток — токен невалиден, выходим
          handleLogout();
        }
      }
    };

    tryLoad();
  }, [isLoggedIn]);

  // Polling входящих запросов для ВОДИТЕЛЯ каждые 4 секунды
  // Работает если есть myTripId (водитель в поиске) или activeTrip (уже в поездке)
  useEffect(() => {
    if (!currentUser || (!myTripId && !activeTrip)) return;

    const playNotificationSound = () => {
      try {
        // Простой beep через Web Audio API
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch (_) { }
      // Вибрация на мобильных
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    };

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/trip-requests/incoming/${currentUser.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('birge_token')}` }
        });
        const requests = await res.json();
        setPendingRequestCount(requests.length);

        // Показываем модал только для НОВЫХ запросов (не виденных раньше)
        const newReq = requests.find(r => !seenRequestIds.current.has(r.id));
        if (newReq) {
          seenRequestIds.current.add(newReq.id);
          setIncomingRequest(newReq);
          playNotificationSound();
          // Нативный push если приложение свёрнуто
          if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            new Notification('🙋 Новый запрос на поездку!', {
              body: `${newReq.requester_name} хочет присоединиться`,
              icon: '/pwa-192x192.png',
            });
          }
        }
      } catch (e) { }
    }, 4000);

    return () => clearInterval(poll);
  }, [currentUser, myTripId, activeTrip]);

  const handleLoggedIn = () => setIsLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem('birge_token');
    saveTrip(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setActiveTripState(null);
    setActiveTab('home');
  };

  if (!isLoggedIn) {
    return <Login onLoggedIn={handleLoggedIn} />;
  }

  const showNotification = (title, message) => {
    setNotification({ show: true, title, message });
    // Нативное Push-уведомление если вкладка скрыта/свернута
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(title, { body: message });
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'trip') setUnreadCount(0); // сброс непрочитанных при открытии чата
  };

  // Колбэк из Chat — новое входящее сообщение
  const handleNewChatMessage = useCallback(() => {
    setActiveTab(current => {
      if (current !== 'trip') {
        setUnreadCount(n => n + 1);
      }
      return current;
    });
  }, []);

  const handleSearch = async (tripData) => {
    if (!currentUser) return showNotification('Ошибка', 'Не удалось загрузить пользователя');

    // Очищаем старую поездку из localStorage чтобы избежать конфликтов
    setActiveTrip(null);
    setMyTripId(null);

    setActiveTab('matches');
    setMatches([]);
    setIsSearching(true);
    setSearchCriteria(tripData);

    try {
      const apiTripData = {
        role: tripData.role,
        origin: tripData.from,
        destination: tripData.to,
        time: tripData.time,
        user_id: currentUser.id
      };

      await api.createTrip(apiTripData);
      setMyTripId(null); // reset
      // После создания — получаем реальный ID из БД
      const myTrips = await api.getMyTrips();
      if (myTrips.length > 0) {
        setMyTripId(myTrips[myTrips.length - 1].id);
      }

      if (tripData.role === 'driver') {
        setCurrentUser(prev => ({ ...prev, trips_today: prev.trips_today + 1 }));
      }

      // Небольшая задержка для красивой анимации скелетонов
      setTimeout(async () => {
        const foundMatches = await api.findMatches(
          currentUser.id,
          tripData.role,
          tripData.from,
          tripData.to,
          tripData.time
        );

        const mappedMatches = foundMatches.map(m => ({
          id: m.id,           // DB id поездки — используется как chatRoomId
          role: m.role,
          from: m.origin,
          to: m.destination,
          origin: m.origin,
          destination: m.destination,
          time: m.time,
          userId: m.user_id,
          user_id: m.user_id,
          user: {
            id: m.user?.id,
            name: m.user?.name || 'Пользователь',
            photo: m.user?.photo || `https://i.pravatar.cc/150?u=${m.user_id}`,
            trust_rating: m.user?.trust_rating || 5.0,
            is_verified: m.user?.is_verified || false,
          }
        }));

        setMatches(mappedMatches);
        setIsSearching(false);

        if (mappedMatches.length > 0) {
          showNotification('Найдены попутчики! 🎉', `Совпадений: ${mappedMatches.length}`);
        } else {
          showNotification('Пока нет совпадений', 'Мы уведомим вас, когда кто-то появится.');
        }
      }, 1200);

    } catch (error) {
      setIsSearching(false);
      setActiveTab('home');
      showNotification('Ошибка', error.message);
    }
  };

  const handleCancelSearch = async () => {
    // Удаляем поездку из БД, чтобы не путала другим пользователям
    if (myTripId) {
      await api.cancelTrip(myTripId);
    }
    setMatches([]);
    setIsSearching(false);
    setMyTripId(null);
    setSearchCriteria(null);
    setActiveTab('home');
  };

  const handleAcceptRequest = async (requestId, tripId, requesterId, requesterTripId) => {
    const acceptedReq = incomingRequest; // сохраняем до сброса
    setIncomingRequest(null);
    setPendingRequestCount(prev => Math.max(0, prev - 1));

    await fetch(`${API_URL}/trip-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('birge_token')}` },
      body: JSON.stringify({ status: 'accepted' })
    });

    // Если водитель уже в поездке — просто приняли запрос, polling обновит список
    if (activeTrip) {
      showNotification('Пассажир принят! 👋', `${acceptedReq?.requester_name} едет с вами`);
      return;
    }

    // Первый пассажир — переходим в экран поездки
    const tripForDriver = {
      id: tripId,         // ID поездки водителя = комната чата для всех
      user_id: requesterId,
      from: acceptedReq?.origin,
      to: acceptedReq?.destination,
      time: acceptedReq?.time,
      isDriver: true,
      seats: acceptedReq?.seats || 3,
      user: {
        id: requesterId,
        name: acceptedReq?.requester_name,
        photo: acceptedReq?.requester_photo,
        trust_rating: acceptedReq?.requester_rating || 5.0,
      },
    };
    await handleConnect(tripForDriver);
  };

  const handleDeclineRequest = async (requestId) => {
    setIncomingRequest(null);
    setPendingRequestCount(prev => Math.max(0, prev - 1));
    await fetch(`${API_URL}/trip-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('birge_token')}` },
      body: JSON.stringify({ status: 'declined' })
    });
  };

  const handleConnect = async (trip) => {
    await api.updateTripStatus(trip.id, 'matched');
    setActiveTrip({ ...trip, participants: 2, date: 'Сегодня' });
    setActiveTab('trip');
    setUnreadCount(0);
    showNotification('Мэтч найден! 🎉', `Вы едете с ${trip.user?.name || 'попутчиком'}`);
  };

  // При acceptе пассажир тоже получает данные машины водителя через requestInfo
  const handleConnectPassenger = async (trip) => {
    const { requestInfo } = trip;
    await api.updateTripStatus(trip.id, 'matched');
    setActiveTrip({
      ...trip,
      participants: 2,
      date: 'Сегодня',
      // Данные машины водителя
      driverCarModel: requestInfo?.driver_car_model,
      driverCarPlate: requestInfo?.driver_car_plate,
      driverCarColor: requestInfo?.driver_car_color,
      driverName: requestInfo?.driver_name,
      driverPhoto: requestInfo?.driver_photo,
    });
    setActiveTab('trip');
    setUnreadCount(0);
    showNotification('Мэтч найден! 🎉', `Вы едете с ${trip.user?.name || 'попутчиком'}`);
  };

  const handleFinishTrip = () => {
    // Показываем модалку отзыва
    setShowReview(true);
  };

  const handleReviewSubmit = async (rating, text) => {
    if (activeTrip && activeTrip.user && currentUser) {
      await api.submitReview(activeTrip.user.id, currentUser.name, rating, text);
      await api.updateTripStatus(activeTrip.id, 'completed');
    }
    // Закрываем через 1.5 сек после успешной отправки
    setTimeout(() => {
      setShowReview(false);
      setActiveTrip(null);
      setActiveTab('home');
    }, 1500);
  };

  const handleReviewSkip = async () => {
    if (activeTrip) await api.updateTripStatus(activeTrip.id, 'completed');
    setShowReview(false);
    setActiveTrip(null);
    setActiveTab('home');
    showNotification('Поездка завершена', 'До следующей встречи!');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard onSearch={handleSearch} />;
      case 'matches':
        return (
          <Matches
            matches={matches}
            setMatches={setMatches}
            onConnect={handleConnectPassenger}
            onCancel={handleCancelSearch}
            isLoading={isSearching}
            searchCriteria={searchCriteria}
            currentUser={currentUser}
            myTripId={myTripId}
          />
        );
      case 'trip':
        if (!activeTrip) {
          return (
            <div className="screen-content" style={{ textAlign: 'center', marginTop: '3rem' }}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{t('matches.empty')}</p>
              <button className="primary-btn" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => setActiveTab('home')}>
                {t('dash.find_ride')}
              </button>
            </div>
          );
        }
        return (
          <Trip
            trip={activeTrip}
            currentUser={currentUser}
            onNewMessage={handleNewChatMessage}
            onPanic={() => showNotification('⚠️ Тревога!', 'Ваши координаты отправлены доверенному контакту.')}
            onFinish={handleFinishTrip}
          />
        );
      case 'profile':
        return (
          <Profile
            currentUser={currentUser}
            onLogout={handleLogout}
            onShowSettings={() => setActiveTab('settings')}
            onShowHistory={() => setActiveTab('history')}
          />
        );
      case 'settings':
        return (
          <Settings
            currentUser={currentUser}
            onBack={() => setActiveTab('profile')}
            onUpdate={(updatedUser) => setCurrentUser(updatedUser)}
          />
        );
      case 'history':
        return (
          <TripHistory
            currentUser={currentUser}
            onBack={() => setActiveTab('profile')}
          />
        );
      default:
        return <Dashboard onSearch={handleSearch} />;
    }
  };

  return (
    <div className="app-container">
      <PushNotification
        show={notification.show}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, show: false })}
      />

      {showReview && (
        <ReviewModal
          partner={activeTrip?.user}
          onSubmit={handleReviewSubmit}
          onSkip={handleReviewSkip}
        />
      )}

      <header className="header" style={{ display: (activeTab === 'profile' || activeTab === 'settings' || activeTab === 'history') ? 'none' : 'block' }}>
        <h1>{t('title')}</h1>
      </header>

      <main className="main-content">
        {renderScreen()}
      </main>

      <InstallPWA />

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home')}>
          <Home size={24} />
          <span>{t('nav.find')}</span>
        </button>
        <button className={`nav-item ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => handleTabChange('matches')}>
          <Users size={24} />
          {/* Для пассажира — кол-во найденных водителей; для водителя — входящие запросы */}
          {pendingRequestCount > 0 && <span className="badge incoming-badge">{pendingRequestCount}</span>}
          {pendingRequestCount === 0 && matches.length > 0 && <span className="badge">{matches.length}</span>}
          <span>{t('matches.title')}</span>
        </button>
        <button className={`nav-item ${activeTab === 'trip' ? 'active' : ''}`} onClick={() => handleTabChange('trip')}>
          <Map size={24} />
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          {activeTrip && unreadCount === 0 && <span className="badge dot" />}
          <span>{t('nav.create')}</span>
        </button>
        <button className={`nav-item ${(activeTab === 'profile' || activeTab === 'settings' || activeTab === 'history') ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
          <User size={24} />
          <span>{t('nav.profile')}</span>
        </button>
      </nav>

      <style>{`
        .app-container { padding-bottom: 70px; min-height: 100vh; }
        .bottom-nav {
          position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 100%; max-width: 480px; background: white;
          display: flex; justify-content: space-around;
          padding: 10px 0 15px 0; border-top: 1px solid #e5e7eb;
          box-shadow: 0 -4px 10px rgba(0,0,0,0.03); z-index: 100;
        }
        .nav-item {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; background: none; border: none; color: #9ca3af;
          font-size: 0.75rem; font-weight: 500; cursor: pointer;
          position: relative; transition: color 0.2s; padding: 0 12px;
        }
        .nav-item:hover { color: #6b7280; }
        .nav-item.active { color: var(--primary); }
        .badge {
          position: absolute; top: -5px; right: 10px;
          background: #f43f5e; color: white; font-size: 0.65rem;
          font-weight: bold; min-width: 16px; height: 16px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px; border: 2px solid white;
        }
        .badge.dot {
          width: 10px; height: 10px; min-width: unset; right: 14px; padding: 0;
        }
        .badge.incoming-badge {
          background: #f59e0b;
          animation: pulse-badge 1.5s ease-in-out infinite;
        }
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
      `}</style>
      {/* Модал входящего запроса для водителя */}
      {incomingRequest && (
        <TripRequestModal
          request={incomingRequest}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
        />
      )}
    </div>
  );
}

export default App;
