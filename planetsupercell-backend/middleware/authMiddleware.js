// Файл: middleware/authMiddleware.js
// Назначение: Middleware для защиты роутов Express.js, требующих аутентификации и/или прав администратора.

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler'); // Для обработки ошибок в async функциях
const User = require('../models/User'); // Импортируем модель пользователя для получения данных
require('dotenv').config(); // Убедимся, что переменные окружения загружены

const JWT_SECRET = process.env.JWT_SECRET;

// --- Middleware для проверки JWT токена и добавления пользователя в req.user ---
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Проверяем наличие заголовка Authorization и его формат (Bearer token)
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // 2. Извлекаем токен (убираем 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // 3. Верифицируем токен с помощью секрета
            // jwt.verify выбросит ошибку, если токен невалиден или истек
            const decoded = jwt.verify(token, JWT_SECRET);

            // 4. Находим пользователя в БД по ID из токена
            //    decoded.user.id - это _id пользователя из НАШЕЙ базы данных (записанный при создании токена)
            //    Исключаем поле пароля (-password), если оно есть в модели User
            req.user = await User.findById(decoded.user.id).select('-password');

            // 5. Проверка, найден ли пользователь (на случай, если юзера удалили, а токен еще жив)
            if (!req.user) {
                 console.warn(`Auth Warning: User with ID ${decoded.user.id} from token not found in DB.`);
                 res.status(401); // Используем 401, т.к. аутентификация по сути не удалась
                 throw new Error('Не авторизован, пользователь не найден');
            }

            // 6. Если все успешно, передаем управление следующему middleware или обработчику роута
            next();

        } catch (error) {
            console.error('Ошибка верификации токена:', error.message);
            res.status(401); // 401 Unauthorized - токен невалиден или ошибка
            // Можно детализировать ошибку в зависимости от error.name (например, TokenExpiredError)
            if (error.name === 'TokenExpiredError') {
                throw new Error('Не авторизован, срок действия токена истек');
            }
            throw new Error('Не авторизован, неверный токен');
        }
    }

    // 7. Если заголовок Authorization отсутствует или имеет неверный формат
    if (!token) {
        res.status(401);
        throw new Error('Не авторизован, токен отсутствует');
    }
});


// --- Middleware для проверки прав администратора ---
// ВАЖНО: Этот middleware должен вызываться ПОСЛЕ middleware 'protect',
// так как он ожидает, что req.user уже был добавлен и проверен.
const admin = (req, res, next) => {
    // Проверяем, существует ли объект пользователя в запросе И является ли он админом
    if (req.user && req.user.isAdmin) {
        next(); // Пользователь - админ, пропускаем дальше
    } else {
        res.status(403); // 403 Forbidden - пользователь аутентифицирован, но не имеет прав
        throw new Error('Доступ запрещен: требуются права администратора.');
    }
};

// --- Экспортируем оба middleware ---
module.exports = { protect, admin };