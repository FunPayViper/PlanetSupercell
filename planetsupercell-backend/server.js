// Файл: server.js
// Назначение: Основной файл для запуска Express.js сервера, настройки middleware,
// подключения к базе данных и подключения обработчиков маршрутов API.

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // Встроенный модуль Node.js для работы с путями
const connectDB = require('./config/db'); // Наш модуль для подключения к MongoDB

// --- Загрузка переменных окружения ---
// Загружает переменные из файла .env в process.env
// Должно быть вызвано до использования process.env
dotenv.config();

// --- Подключение к базе данных ---
// Вызываем функцию, которую мы определили в config/db.js
connectDB();

// --- Инициализация Express приложения ---
const app = express();

// --- Настройка Middleware ---

// 1. CORS (Cross-Origin Resource Sharing)
// Позволяет браузеру делать запросы к нашему API с другого домена/порта
// (например, с фронтенда, запущенного на localhost:3000 к бэкенду на localhost:5000)
// Для разработки можно использовать базовую настройку.
// ВАЖНО: Для продакшена настройте CORS более строго, указав разрешенные origin!
// app.use(cors({ origin: 'YOUR_FRONTEND_URL' }));
app.use(cors());

// 2. Body Parsers
// Позволяет Express разбирать тело входящих запросов
// - express.json(): для парсинга JSON тел (например, от fetch с Content-Type: application/json)
//   Увеличим лимит, если планируете передавать большие Data URL (хотя загрузка файлов через multer лучше)
app.use(express.json({ limit: '10mb' }));
// - express.urlencoded(): для парсинга тел, закодированных как URL (например, из HTML форм)
app.use(express.urlencoded({ extended: false, limit: '10mb' }));


// --- Определение базового маршрута API (для проверки) ---
app.get('/api', (req, res) => {
    res.send('PlanetSupercell API запущен и работает!');
});


// --- Подключение Маршрутов API ---
// Указываем Express использовать соответствующие файлы роутов для запросов,
// начинающихся с указанного префикса.
app.use('/api/auth', require('./routes/auth'));          // Маршруты аутентификации
app.use('/api/categories', require('./routes/categories'));// Маршруты категорий
app.use('/api/products', require('./routes/products'));    // Маршруты товаров
app.use('/api/orders', require('./routes/orders'));        // Маршруты заказов
app.use('/api/reviews', require('./routes/reviews'));      // Маршруты отзывов

// --- Раздача Статических Файлов (для Загруженных Изображений) ---
// Делаем папку 'uploads' доступной публично по URL '/uploads'
// __dirname - это текущая директория, где находится server.js
// path.join используется для создания корректного пути независимо от ОС
const uploadsPath = path.join(__dirname, '/uploads');
console.log(`Настройка статического пути для /uploads: ${uploadsPath}`); // Лог для проверки пути
app.use('/uploads', express.static(uploadsPath));


// --- Обработка Ошибок ---

// 1. Обработчик для ненайденных маршрутов (404)
// Этот middleware должен идти ПОСЛЕ всех определений маршрутов
app.use((req, res, next) => {
    const error = new Error(`Не найдено - ${req.originalUrl}`);
    res.status(404);
    next(error); // Передаем ошибку дальше, в основной обработчик
});

// 2. Основной обработчик ошибок
// Принимает 4 аргумента (err, req, res, next)
// Сюда попадают ошибки, переданные через next(error) или выброшенные
// в асинхронных функциях с использованием express-async-handler
app.use((err, req, res, next) => {
    // Устанавливаем статус код: если он уже установлен (например, 404, 401, 403), используем его, иначе 500 (Internal Server Error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);

    // Логгируем ошибку на сервере
    console.error('-------------------- ОШИБКА --------------------');
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.error('Сообщение:', err.message);
    // Показываем стек только в режиме разработки
    if (process.env.NODE_ENV !== 'production') {
        console.error('Стек:', err.stack);
    }
     console.error('-----------------------------------------------');


    // Отправляем JSON ответ клиенту
    res.json({
        message: err.message,
        // Отправляем стек ошибки только в режиме разработки для отладки
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});


// --- Запуск Сервера ---
// Берем порт из переменных окружения или используем 5000 по умолчанию
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('------------------------------------------');
    console.log(`Сервер запущен в режиме '${process.env.NODE_ENV || 'development'}' на порту ${PORT}`);
    console.log(`API доступен по адресу: http://localhost:${PORT}/api`);
    console.log(`Статические файлы из /uploads доступны по адресу: http://localhost:${PORT}/uploads`);
    console.log('------------------------------------------');
});