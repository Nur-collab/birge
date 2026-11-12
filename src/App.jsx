import React, { useState, useEffect, useCallback } from 'react';
import { Home, Users, Map, User, Calendar, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Dashboard from './screens/Dashboard';
import Matches from './screens/Matches';
import Trip from './screens/Trip';
import Profile from './screens/Profile';
import Settings from './screens/Settings';
import TripHistory from './screens/TripHistory';
import ScheduledTrips from './screens/ScheduledTrips';
import Login from './screens/Login';
import InstallPWA from './components/InstallPWA';
import PushNotification from './components/PushNotification';
import ReviewModal from './components/ReviewModal';
import TripRequestModal from './components/TripRequestModal';
import ResumeTripBanner from './components/ResumeTripBanner';
import { api, tokenStorage } from './utils/api';
import { localDateStr } from './utils/date';
import OfflineIndicator from './components/OfflineIndicator';

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
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('birge_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('birge_theme', theme);
    } catch (_) {}
  }, [theme]);

  const toggleTheme = () => {
    if ('vibrate' in navigator) navigator.vibrate?.(10);
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [authRetry, setAuthRetry] = useState(0);
  const [activeTab, setActiveTab] = useState(() => {
    // Восстанавливаем таб — если была активная поездка, переходим сразу на неё
    return loadTrip() ? 'trip' : 'home';
  });
  const [matches, setMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTrip, setActiveTripState] = useState(loadTrip);
  const [notification, setNotification] = useState({ show: false, title: '', message: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [orphanedTrip, setOrphanedTrip] = useState(null);     // поездка оставшаяся active после закрытия приложения
  const [unreadCount, setUnreadCount] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [myTripId, setMyTripId] = useState(null); // ID поездки текущего пользователя
  const [incomingRequest, setIncomingRequest] = useState(null); // для водителя
  const [pendingRequestCount, setPendingRequestCount] = useState(0); // badge для водителя
  const seenRequestIds = React.useRef(new Set()); // чтобы не показывать один и тот же запрос дважды
  const [scheduledTrips, setScheduledTrips] = useState([]); // запланированные поездки (для badge)

  // Обёртка setActiveTrip — автоматически пишет/очищает localStorage
  const setActiveTrip = useCallback((trip) => {
    setActiveTripState(trip);
    saveTrip(trip);
  }, []);

  // Колбэк из Chat — новое входящее сообщение
  const handleNewChatMessage = useCallback(() => {
    setActiveTab(current => {
      if (current !== 'trip') {
        setUnreadCount(n => n + 1);
      }
      return current;
    });
  }, []);

  // Инициализация авторизации по JWT-токену.
  // Сетевая ошибка НЕ должна разлогинивать: токен остаётся, показываем retry.
  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      setAuthError(false);
      const token = tokenStorage.get();
      if (!token) {
        setAuthLoading(false);
        setIsLoggedIn(false);
        setCurrentUser(null);
        return;
      }
      try {
        const profile = await api.getCurrentUser();
        if (cancelled) return;
        if (profile) {
          setCurrentUser(profile);
          setIsLoggedIn(true);
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
          if (!loadTrip()) {
            try {
              const activeRes = await api.getActiveTrip();
              if (!cancelled && activeRes?.found) setOrphanedTrip(activeRes);
            } catch (_) {
              // Активная поездка не критична для входа.
            }
          }
        } else {
          tokenStorage.clear();
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      } catch (e) {
        if (cancelled) return;
        if (e.status === 401 || e.status === 403) {
          tokenStorage.clear();
          setIsLoggedIn(false);
          setCurrentUser(null);
        } else {
          setAuthError(true);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      setIsLoggedIn(false);
      setCurrentUser(null);
      saveTrip(null);
      setActiveTripState(null);
    };

    window.addEventListener('birge:unauthorized', handleUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener('birge:unauthorized', handleUnauthorized);
    };
  }, [authRetry]);

  // Подписка на входящие запросы для ВОДИТЕЛЯ через опрос бэкенда
  // Активна пока водитель в поиске (myTripId) или в активной поездке (activeTrip)
  useEffect(() => {
    if (!currentUser || (!myTripId && !activeTrip)) return;

    /** Звук + вибрация при новом запросе */
    const playNotificationSound = () => {
      try {
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
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    };

    // Подписываемся на бэкенд — получаем новые pending-запросы
    const unsubscribe = api.subscribeIncomingRequests((requests) => {
      setPendingRequestCount(requests.length);
      // Показываем модал для новых запросов
      const newReq = requests.find(r => !seenRequestIds.current.has(r.id));
      if (newReq) {
        seenRequestIds.current.add(newReq.id);
        setIncomingRequest(newReq);
        playNotificationSound();
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification('🙋 Новый запрос на поездку!', {
            body: `${newReq.requester_name} хочет присоединиться`,
            icon: '/pwa-192x192.png',
          });
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, myTripId, activeTrip]);

  const handleLoggedIn = (user) => {
    if (!user) return;
    setCurrentUser(user);
    setIsLoggedIn(true);
    if (!loadTrip()) {
      api.getActiveTrip().then((res) => {
        if (res?.found) setOrphanedTrip(res);
      }).catch(() => {});
    }
  };

  const handleLogout = async () => {
    api.logout();
    saveTrip(null);
    setCurrentUser(null);
    setActiveTripState(null);
    setOrphanedTrip(null);
    setIsLoggedIn(false);
    setActiveTab('home');
  };


  /** Возобновить поиск: восстанавливаем myTripId и переходим на вкладку Матчей */
  const handleResumeOrphan = () => {
    if (!orphanedTrip) return;
    setMyTripId(orphanedTrip.trip_id);
    setSearchCriteria({
      role: orphanedTrip.role,
      from: orphanedTrip.origin,
      to: orphanedTrip.destination,
      time: orphanedTrip.time,
      date: orphanedTrip.date,
    });
    setOrphanedTrip(null);
    setActiveTab('matches');
  };

  /** Удалить оставшуюся поездку из БД, скрыть баннер */
  const handleDiscardOrphan = async () => {
    if (!orphanedTrip) return;
    try {
      await api.cancelTrip(orphanedTrip.trip_id);
      setOrphanedTrip(null);
    } catch (e) {
      showNotification('Ошибка', e.message);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <div className="login-logo-badge" style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800 }}>Б</div>
        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Проверяем сессию...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem' }}>📡</div>
        <h2 style={{ margin: 0, color: '#111827' }}>Нет связи с сервером</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: 340 }}>
          Не удалось загрузить профиль. Проверьте интернет и повторите — сессия сохранена.
        </p>
        <button
          className="primary-btn"
          style={{ width: 'auto', padding: '11px 28px' }}
          onClick={() => { setAuthLoading(true); setAuthRetry(n => n + 1); }}
        >
          Повторить
        </button>
      </div>
    );
  }

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
        date: tripData.date || null,
        seats: tripData.seats || 3,
        price_per_seat: tripData.price || 0,
      };

      const createdTrip = await api.createTrip(apiTripData);
      // ID поездки берём напрямую из ответа бэкенда — надёжно и без лишнего запроса
      setMyTripId(createdTrip.id);

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
          tripData.time,
          tripData.seats,
          tripData.date || null
        );

        const mappedMatches = foundMatches.map(m => ({
          id: m.id,
          role: m.role,
          from: m.origin,
          to: m.destination,
          origin: m.origin,
          destination: m.destination,
          time: m.time,
          date: m.date || null,
          price_per_seat: m.price_per_seat || 0,
          userId: m.user_id,
          user_id: m.user_id,
          user: {
            id: m.user?.id,
            name: m.user?.name || 'Пользователь',
            photo: m.user?.photo || `https://i.pravatar.cc/150?u=${m.user_id}`,
            trust_rating: m.user?.trust_rating || 5.0,
            is_verified: m.user?.is_verified || false,
            car_model: m.user?.car_model || null,
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
      try {
        await api.cancelTrip(myTripId);
      } catch (e) {
        showNotification('Ошибка', e.message);
        return;
      }
    }
    setMatches([]);
    setIsSearching(false);
    setMyTripId(null);
    setSearchCriteria(null);
    setActiveTab('home');
  };

  const handleAcceptRequest = async (requestId, tripId, requesterId, requesterTripId) => {
    const acceptedReq = incomingRequest; // сохраняем до сброса
    try {
      await api.respondToRequest(requestId, 'accept');
    } catch (e) {
      showNotification('Ошибка', e.message);
      return;
    }

    setIncomingRequest(null);
    setPendingRequestCount(prev => Math.max(0, prev - 1));

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
      date: acceptedReq?.date,
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
    try {
      await api.respondToRequest(requestId, 'decline');
    } catch (e) {
      showNotification('Ошибка', e.message);
      return;
    }
    setIncomingRequest(null);
    setPendingRequestCount(prev => Math.max(0, prev - 1));
  };

  const handleConnect = async (trip) => {
    const todayStr = localDateStr();
    const tripDate = trip.date && trip.date !== 'Сегодня' ? trip.date : todayStr;
    const isScheduled = tripDate > todayStr;
    // Статус поездки меняет только бэкенд: matched — когда заняты все места,
    // scheduled — для будущей даты. Иначе 3-местная машина закрывалась бы
    // после первого же пассажира.
    setActiveTrip({ ...trip, participants: 2, date: trip.date || 'Сегодня', isScheduled });
    setActiveTab('trip');
    setUnreadCount(0);
    const msg = isScheduled
      ? `Поездка с ${trip.user?.name || 'попутчиком'} запланирована!`
      : `Вы едете с ${trip.user?.name || 'попутчиком'}`;
    showNotification(isScheduled ? '📅 Запланировано!' : 'Мэтч найден! 🎉', msg);
  };

  // При acceptе пассажир тоже получает данные машины водителя через requestInfo
  const handleConnectPassenger = async (trip) => {
    const { requestInfo } = trip;
    const todayStr = localDateStr();
    const tripDate = trip.date && trip.date !== 'Сегодня' ? trip.date : todayStr;
    const isScheduled = tripDate > todayStr;
    // Пассажир не имеет права менять статус поездки водителя — это делает
    // бэкенд атомарно при accept. Здесь только открываем экран поездки.
    setActiveTrip({
      ...trip,
      participants: 2,
      date: trip.date || 'Сегодня',
      isScheduled,
      driverCarModel: requestInfo?.driver_car_model,
      driverCarPlate: requestInfo?.driver_car_plate,
      driverCarColor: requestInfo?.driver_car_color,
      driverName: requestInfo?.driver_name,
      driverPhoto: requestInfo?.driver_photo,
    });
    setActiveTab('trip');
    setUnreadCount(0);
    const msg = isScheduled
      ? `Поездка с водителем запланирована!`
      : `Вы едете с ${trip.user?.name || 'попутчиком'}`;
    showNotification(isScheduled ? '📅 Запланировано!' : 'Мэтч найден! 🎉', msg);
  };

  const handleFinishTrip = () => {
    // Показываем модалку отзыва
    setShowReview(true);
  };

  const handleReviewSubmit = async (rating, text) => {
    if (activeTrip?.user?.id && currentUser) {
      // Сначала фиксируем завершение: бэкенд разрешает отзыв только по
      // завершённой заявке.
      try {
        await api.updateTripStatus(activeTrip.id, 'completed');
      } catch (_) {}
      try {
        await api.submitReview(activeTrip.user.id, rating, text, activeTrip.id);
      } catch (e) {
        showNotification('Ошибка', e.message);
        return;
      }
      try {
        // Обновляем профиль, чтобы новый рейтинг отобразился сразу
        const refreshed = await api.getCurrentUser();
        if (refreshed) setCurrentUser(refreshed);
      } catch (_) {}
    }
    // Закрываем через 1.5 сек после успешной отправки
    setTimeout(() => {
      setShowReview(false);
      setActiveTrip(null);
      setActiveTab('home');
    }, 1500);
  };

  const handleReviewSkip = async () => {
    if (activeTrip) {
      try {
        await api.updateTripStatus(activeTrip.id, 'completed');
      } catch (_) {}
    }
    setShowReview(false);
    setActiveTrip(null);
    setActiveTab('home');
    showNotification('Поездка завершена', 'До следующей встречи!');
  };

  const handleTripCancelled = () => {
    setActiveTrip(null);
    setActiveTab('home');
    showNotification('Поездка отменена', 'Вы можете найти нового попутчика.');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard onSearch={handleSearch} currentUser={currentUser} onShowSettings={() => setActiveTab('settings')} />;
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
        // УМНАЯ ВКЛАДКА: если есть активная поездка — показываем её
        // Если нет — показываем список запланированных
        if (activeTrip) {
          return (
            <Trip
              trip={activeTrip}
              currentUser={currentUser}
              onNewMessage={handleNewChatMessage}
              onPanic={async () => {
                // Отправляем реальный тревожный сигнал в Telegram поддержки
                const result = await api.sendPanic(activeTrip?.id);
                if (result?.sent) {
                  showNotification('🚨 Тревога отправлена!', 'Команда поддержки уведомлена через Telegram.');
                } else {
                  showNotification('Не удалось отправить тревогу', result?.reason || 'Проверьте связь или позвоните 102.');
                }
              }}
              onFinish={handleFinishTrip}
              onCancelled={handleTripCancelled}
            />
          );
        }
        return (
          <ScheduledTrips
            currentUser={currentUser}
            onCancel={() => setActiveTab('home')}
            onOpenTrip={(scheduledTrip) => {
              // Открываем запланированную поездку в Trip.jsx
              const tripData = {
                id: scheduledTrip.trip_id,
                from: scheduledTrip.origin,
                to: scheduledTrip.destination,
                origin: scheduledTrip.origin,
                destination: scheduledTrip.destination,
                time: scheduledTrip.time,
                date: scheduledTrip.date,
                isDriver: scheduledTrip.role === 'driver',
                isScheduled: true,
                seats: scheduledTrip.seats,
                user: scheduledTrip.role === 'passenger' && scheduledTrip.driver ? {
                  id: scheduledTrip.driver.id,
                  name: scheduledTrip.driver.name,
                  photo: scheduledTrip.driver.photo,
                  trust_rating: scheduledTrip.driver.trust_rating,
                  is_verified: scheduledTrip.driver.is_verified,
                } : (scheduledTrip.passengers?.[0] || null),
                driverCarModel: scheduledTrip.driver?.car_model,
                driverCarPlate: scheduledTrip.driver?.car_plate,
                driverCarColor: scheduledTrip.driver?.car_color,
              };
              setActiveTrip(tripData);
              // Не переключаем таб — Trip уже рендерится в этом же case
            }}
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
      <OfflineIndicator />

      {showReview && (
        <ReviewModal
          partner={activeTrip?.user}
          onSubmit={handleReviewSubmit}
          onSkip={handleReviewSkip}
        />
      )}

      <header className="header" style={{ display: (activeTab === 'profile' || activeTab === 'settings' || activeTab === 'history') ? 'none' : 'block' }}>
        <div className="header-inner">
          <div className="header-logo">
            <div className="header-logo-badge">Б</div>
            <span className="header-title">BIRGE</span>
          </div>
          <div className="header-actions">
            {currentUser && (
              <span className="header-greeting">
                {currentUser.name?.split(' ')[0] || 'Привет'} 👋
              </span>
            )}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              aria-label="Сменить тему оформления"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {renderScreen()}
      </main>

      <InstallPWA />

      {/* Баннер возобновления поиска */}
      {orphanedTrip && activeTab === 'home' && (
        <ResumeTripBanner
          trip={orphanedTrip}
          onResume={handleResumeOrphan}
          onDiscard={handleDiscardOrphan}
        />
      )}

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
          {activeTrip ? <Map size={24} /> : <Calendar size={24} />}
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          {activeTrip && unreadCount === 0 && <span className="badge dot" />}
          <span>{activeTrip ? t('nav.on_way') : t('nav.trips')}</span>
        </button>
        <button className={`nav-item ${(activeTab === 'profile' || activeTab === 'settings' || activeTab === 'history') ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
          <User size={24} />
          <span>{t('nav.profile')}</span>
        </button>
      </nav>

      <style>{`
        .app-container {
          padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
          min-height: 100vh;
          min-height: 100dvh;
        }
        .bottom-nav {
          position: fixed;
          bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 24px);
          max-width: 456px;
          background: var(--nav-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--nav-border);
          border-radius: 28px;
          box-shadow: var(--floating-shadow);
          display: flex;
          justify-content: space-around;
          padding: 6px;
          z-index: 100;
          transition: background-color 0.25s ease, border-color 0.25s ease;
        }
        .nav-item {
          flex: 1;
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; background: none; border: none; color: var(--text-subtle);
          font-size: 0.68rem; font-weight: 600; cursor: pointer;
          position: relative; transition: all 0.2s;
          padding: 9px 6px 8px;
          border-radius: 20px;
          letter-spacing: 0.2px;
        }
        .nav-item:hover { color: var(--text-main); background: var(--bg-subtle); }
        .nav-item.active {
          color: var(--primary);
          background: var(--nav-active-bg);
        }
        .badge {
          position: absolute; top: 2px; right: 12px;
          background: #f43f5e; color: white; font-size: 0.62rem;
          font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px; border: 2px solid var(--bg-app);
          box-shadow: 0 2px 6px rgba(244,63,94,0.4);
        }
        .badge.dot {
          width: 8px; height: 8px; min-width: unset; right: 14px; padding: 0;
          top: 4px;
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
