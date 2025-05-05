// Файл: controllers/authController.js
// Назначение: Обработка аутентификации пользователей через Telegram Web App.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Убедимся, что переменные окружения загружены
const User = require('../models/User'); // Импортируем модель пользователя

// --- Ключевые переменные из .env ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_TG_ID = parseInt(process.env.ADMIN_TELEGRAM_ID, 10); // Преобразуем в число

// @desc    Проверка данных аутентификации Telegram и вход/регистрация пользователя
// @route   POST /api/auth/telegram
// @access  Public
exports.verifyTelegramAuth = async (req, res) => {
    const { initData } = req.body;

    // 1. --- Проверка наличия необходимых данных ---
    if (!initData) {
        return res.status(400).json({ message: 'Ошибка: initData не предоставлены.' });
    }
    if (!BOT_TOKEN) {
        console.error("Критическая ошибка: TELEGRAM_BOT_TOKEN не найден в .env");
        return res.status(500).json({ message: 'Ошибка конфигурации сервера: отсутствует токен бота.' });
    }
     if (!JWT_SECRET) {
        console.error("Критическая ошибка: JWT_SECRET не найден в .env");
        return res.status(500).json({ message: 'Ошибка конфигурации сервера: отсутствует секрет JWT.' });
    }
     if (isNaN(ADMIN_TG_ID)) {
        console.error("Критическая ошибка: ADMIN_TELEGRAM_ID не найден или не является числом в .env");
        return res.status(500).json({ message: 'Ошибка конфигурации сервера: некорректный ID администратора.' });
    }

    // 2. --- Валидация initData ---
    try {
        const isValid = validateTelegramData(initData, BOT_TOKEN);
        if (!isValid) {
            console.warn("Попытка входа с невалидными initData:", initData);
            return res.status(401).json({ message: 'Ошибка: Невалидные данные аутентификации.' });
        }

        // 3. --- Извлечение данных пользователя ---
        const params = new URLSearchParams(initData);
        const userData = JSON.parse(params.get('user'));

        if (!userData || !userData.id) {
             console.error("Ошибка парсинга user из initData:", params.get('user'));
            return res.status(400).json({ message: 'Ошибка: Не удалось извлечь данные пользователя из initData.' });
        }

        const telegramId = userData.id;
        const firstName = userData.first_name || '';
        const lastName = userData.last_name || '';
        const username = userData.username || '';

        // 4. --- Поиск или создание пользователя в БД ---
        let user = await User.findOne({ telegramId: telegramId });
        let isNewUser = false;

        if (user) {
            // Пользователь найден, обновим данные, если они изменились
            let needsUpdate = false;
            if (user.firstName !== firstName) { user.firstName = firstName; needsUpdate = true; }
            if (user.lastName !== lastName) { user.lastName = lastName; needsUpdate = true; }
            if (user.username !== username) { user.username = username; needsUpdate = true; }
            // Перепроверяем админский статус на случай изменения в .env (хотя лучше это делать при старте)
            const shouldBeAdmin = user.telegramId === ADMIN_TG_ID;
            if (user.isAdmin !== shouldBeAdmin) { user.isAdmin = shouldBeAdmin; needsUpdate = true; }

            if (needsUpdate) {
                 console.log(`Обновление данных для пользователя с TG ID: ${telegramId}`);
                await user.save();
            }

        } else {
            // Пользователь не найден, создаем нового
             isNewUser = true;
            const isAdmin = telegramId === ADMIN_TG_ID; // Определяем, админ ли это
             console.log(`Создание нового пользователя с TG ID: ${telegramId}, isAdmin: ${isAdmin}`);
            user = await User.create({
                telegramId,
                firstName,
                lastName,
                username,
                isAdmin,
            });
        }

        // 5. --- Генерация JWT токена ---
        const payload = {
            user: {
                id: user._id, // Используем ID из НАШЕЙ базы данных
                isAdmin: user.isAdmin // Включаем флаг админа в токен
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '7d' }, // Токен действителен 7 дней
            (err, token) => {
                if (err) {
                    console.error("Ошибка генерации JWT:", err);
                     return res.status(500).json({ message: 'Ошибка сервера при генерации токена.' });
                }

                // 6. --- Отправка токена и данных пользователя ---
                res.json({
                    token,
                    user: { // Возвращаем базовую информацию о пользователе
                        id: user._id,
                        telegramId: user.telegramId,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        username: user.username,
                        isAdmin: user.isAdmin,
                        createdAt: user.createdAt // Полезно знать дату регистрации в системе
                    },
                    isNewUser // Можно использовать на фронтенде для приветствия
                });
            }
        );

    } catch (error) {
        console.error('Ошибка в процессе верификации Telegram Auth:', error);
        // Проверяем специфичные ошибки валидации Mongoose
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: `Ошибка валидации данных пользователя: ${error.message}` });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};


// --- Вспомогательная функция для валидации initData ---
function validateTelegramData(initData, botToken) {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return false; // Хэш обязателен

        const dataToCheck = [];
        // Собираем все параметры КРОМЕ hash и сортируем их
        for (const [key, value] of params.entries()) {
            if (key !== 'hash') {
                dataToCheck.push(`${key}=${value}`);
            }
        }
        dataToCheck.sort(); // Сортируем по ключу

        const dataCheckString = dataToCheck.join('\n');

        // Вычисляем секретный ключ
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

        // Вычисляем хэш строки данных
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        // Сравниваем вычисленный хэш с полученным
        return calculatedHash === hash;

    } catch (error) {
        console.error("Ошибка во время валидации Telegram данных:", error);
        return false; // Считаем невалидным при любой ошибке в процессе
    }
}

// Можно добавить и другие функции, если они нужны для аутентификации,
// например, выход из системы (хотя для JWT это обычно просто удаление токена на клиенте)
// exports.logout = (req, res) => { ... };