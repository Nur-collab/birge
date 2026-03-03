import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Словари переводов
// В будущем эти объекты можно вынести в отдельные JSON-файлы
const resources = {
    ru: {
        translation: {
            // Общие
            "title": "Birge",
            "loading": "Загрузка...",
            "save": "Сохранить",
            "cancel": "Отмена",
            "back": "Назад",

            // Авторизация
            "auth.login": "Вход",
            "auth.phone_number": "Номер телефона",
            "auth.enter_phone": "Введите номер телефона без +",
            "auth.get_code": "Получить код",
            "auth.sms_code": "Код из SMS",
            "auth.check_sms": "Проверьте консоль сервера для получения кода (имитация SMS).",
            "auth.enter_code": "Введите 4-значный код",
            "auth.verify": "Войти",
            "auth.error_invalid_phone": "Введите 12 цифр, начиная с 996",
            "auth.error_generic": "Ошибка авторизации",

            // Навигация / Таббар
            "nav.find": "Поиск",
            "nav.create": "Создать",
            "nav.profile": "Профиль",

            // Главный экран (Dashboard)
            "dash.greeting": "Привет, {{name}}! 👋",
            "dash.where_to": "Куда поедем сегодня?",
            "dash.find_ride": "Найти поездку",
            "dash.offer_ride": "Предложить поездку",
            "dash.your_location": "Вы здесь",
            "dash.unknown_location": "Ищем вас...",

            // Поиск и Фильтры
            "search.from": "Откуда",
            "search.to": "Куда",
            "search.date": "Дата поездки",
            "search.search_btn": "Найти",
            "search.creating_ride": "Создание поездки...",
            "search.create_btn": "Создать",

            // Совпадения (Matches)
            "matches.title": "Ваши поездки",
            "matches.empty": "Пока нет подходящих поездок",
            "matches.searching": "Ищем совпадения...",
            "matches.trip": "Поездка",
            "matches.price": "Цена",
            "matches.seats": "Мест",
            "matches.driver": "Водитель",
            "matches.passenger": "Пассажир",
            "matches.open": "Открыть чат",
            "matches.status.active": "В процессе",
            "matches.status.completed": "Завершено",

            // Детали поездки и Чат (Trip / Chat)
            "trip.title": "Поездка",
            "trip.details": "Детали",
            "trip.car": "Автомобиль: {{model}} ({{color}})",
            "trip.plate": "Гос. номер: {{plate}}",
            "trip.chat": "Чат",
            "trip.type_message": "Сообщение...",
            "trip.send": "Отправить",

            // Профиль и Настройки
            "profile.title": "Мой Профиль",
            "profile.history": "История поездок",
            "profile.settings": "Настройки",
            "profile.logout": "Выйти",
            "profile.rating": "Рейтинг",
            "profile.reviews": "Отзывов",
            "profile.since": "С нами",
            "profile.trips_today": "Поездок водителем (сегодня)",
            "profile.trips_hint": "Ради безопасности мы ограничиваем поездки для предотвращения коммерческого извоза.",
            "profile.reviews_title": "Отзывы от попутчиков",
            "profile.no_reviews": "Пока нет отзывов",

            "settings.title": "Настройки",
            "settings.language": "Язык приложения",
            "settings.personal": "Личные данные",
            "settings.name": "Имя",
            "settings.photo_url": "URL Фотографии",
            "settings.driver_info": "Данные автомобиля (если вы водитель)",
            "settings.car_model": "Марка авто",
            "settings.car_color": "Цвет авто",
            "settings.car_plate": "Гос. номер",
            "settings.saved_success": "Настройки сохранены!",

            // История поездок
            "history.title": "История поездок",
            "history.empty": "Пока нет поездок",

            // Отзывы
            "review.title": "Оцените поездку",
            "review.how_was_trip": "Как прошла поездка?",
            "review.placeholder": "Оставьте комментарий (необязательно)...",
            "review.skip": "Пропустить",
            "review.submit": "Отправить",
            "review.thanks": "Спасибо за отзыв!",
            "review.community": "Вы помогаете сообществу становиться лучше",
            "review.rating.0": "",
            "review.terrible": "Ужасно 😔",
            "review.bad": "Плохо 😕",
            "review.ok": "Нормально 😐",
            "review.good": "Хорошо 😊",
            "review.great": "Отлично! 🤩"
        }
    },
    ky: {
        translation: {
            // Общие
            "title": "Бирге", // Birge
            "loading": "Жүктөлүүдө...",
            "save": "Сактоо",
            "cancel": "Жокко чыгаруу",
            "back": "Артка",

            // Авторизация
            "auth.login": "Кирүү",
            "auth.phone_number": "Телефон номери",
            "auth.enter_phone": "Номерди + жок киргизиңиз",
            "auth.get_code": "Кодду алуу",
            "auth.sms_code": "SMS код",
            "auth.check_sms": "Кодду алуу үчүн сервердин консолун текшериңиз (SMS тууроосу).",
            "auth.enter_code": "4 орундуу кодду киргизиңиз",
            "auth.verify": "Кирүү",
            "auth.error_invalid_phone": "996 менен башталган 12 санды киргизиңиз",
            "auth.error_generic": "Авторизация катасы",

            // Навигация / Таббар
            "nav.find": "Издөө",
            "nav.create": "Түзүү",
            "nav.profile": "Профиль",

            // Главный экран (Dashboard)
            "dash.greeting": "Салам, {{name}}! 👋",
            "dash.where_to": "Бүгүн кайда барабыз?",
            "dash.find_ride": "Жолдош издөө",
            "dash.offer_ride": "Жолго чыгуу",
            "dash.your_location": "Сиз бул жердесиз",
            "dash.unknown_location": "Сизди издеп жатабыз...",

            // Поиск и Фильтры
            "search.from": "Кайдан",
            "search.to": "Каякка",
            "search.date": "Күнү",
            "search.search_btn": "Издөө",
            "search.creating_ride": "Жолго чыгуу түзүлүүдө...",
            "search.create_btn": "Түзүү",

            // Совпадения (Matches)
            "matches.title": "Сиздин сапарларыңыз",
            "matches.empty": "Учурда ылайыктуу сапарлар жок",
            "matches.searching": "Издеп жатабыз...",
            "matches.trip": "Сапар",
            "matches.price": "Баасы",
            "matches.seats": "Орун",
            "matches.driver": "Айдоочу",
            "matches.passenger": "Жүргүнчү",
            "matches.open": "Чатты ачуу",
            "matches.status.active": "Жүрүп жатат",
            "matches.status.completed": "Аяктады",

            // Детали поездки и Чат (Trip / Chat)
            "trip.title": "Сапар",
            "trip.details": "Маалымат",
            "trip.car": "Унаа: {{model}} ({{color}})",
            "trip.plate": "Мам. номер: {{plate}}",
            "trip.chat": "Чат",
            "trip.type_message": "Билдирүү...",
            "trip.send": "Жөнөтүү",

            // Профиль и Настройки
            "profile.title": "Менин профилим",
            "profile.history": "Сапарлар тарыхы",
            "profile.settings": "Жөндөөлөр",
            "profile.logout": "Чыгуу",
            "profile.rating": "Рейтинг",
            "profile.reviews": "Пикирлер",
            "profile.since": "Биз менен",
            "profile.trips_today": "Айдоочу катары сапарлар (бүгүн)",
            "profile.trips_hint": "Коммерциялык такси болбосун деп сапарларды чектейбиз.",
            "profile.reviews_title": "Жолдоштордун пикирлери",
            "profile.no_reviews": "Азырынча пикирлер жок",

            "settings.title": "Ырастоолор",
            "settings.language": "Тиркеме тили",
            "settings.personal": "Жеке маалыматтар",
            "settings.name": "Аты-жөнү",
            "settings.photo_url": "Сүрөт URL",
            "settings.driver_info": "Унаа маалыматы (айдоочу болсоңуз)",
            "settings.car_model": "Унаа маркасы",
            "settings.car_color": "Унаа түсү",
            "settings.car_plate": "Мам. номер",
            "settings.saved_success": "Ырастоолор сакталды!",

            // История поездок
            "history.title": "Сапарлар тарыхы",
            "history.empty": "Сизде азырынча сапарлар жок",

            // Отзывы
            "review.title": "Сапарды баалаңыз",
            "review.how_was_trip": "Сапар кандай болду?",
            "review.placeholder": "Комментарий калтырыңыз (милдеттүү эмес)...",
            "review.skip": "Өткөрүп жибер",
            "review.submit": "Жөнөтүү",
            "review.thanks": "Пикириңиз үчүн рахмат!",
            "review.community": "Сиз коомчулукту жакшыртууга жардам бересиз",
            "review.rating.0": "",
            "review.terrible": "Жаман 😔",
            "review.bad": "Начар 😕",
            "review.ok": "Жакшы 😐",
            "review.good": "Жакшы 😊",
            "review.great": "Мыкты! 🤩"
        }
    }
};

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: localStorage.getItem('i18nextLng') || "ru", // язык по умолчанию (или из localStorage)
        fallbackLng: "ru",

        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
