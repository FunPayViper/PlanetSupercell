// Файл: config/db.js
// Назначение: Устанавливает соединение с базой данных MongoDB с использованием Mongoose.

const mongoose = require('mongoose');
require('dotenv').config(); // Загружаем переменные окружения из файла .env в корне проекта

// --- Получение строки подключения из переменных окружения ---
// process.env.MONGO_URI будет содержать значение из вашего файла .env
// Например: mongodb://localhost:27017/planetsupercell
const dbUri = process.env.MONGO_URI;

// --- Асинхронная функция для подключения к базе данных ---
const connectDB = async () => {
  // Проверка: Убедимся, что строка подключения MONGO_URI существует в .env
  if (!dbUri) {
    console.error('------------------------------------------------------');
    console.error('Критическая ошибка: Переменная окружения MONGO_URI не найдена.');
    console.error('Пожалуйста, создайте файл .env в корне проекта и добавьте строку:');
    console.error('MONGO_URI=mongodb://localhost:27017/planetsupercell');
    console.error('(Замените на вашу строку подключения, если используете MongoDB Atlas или другой хост)');
    console.error('------------------------------------------------------');
    process.exit(1); // Завершаем работу приложения, так как без БД оно бесполезно
  }

  try {
    // --- Установка соединения ---
    // mongoose.connect возвращает промис, поэтому используем await
    await mongoose.connect(dbUri, {
      // В современных версиях Mongoose (6+) многие опции, такие как
      // useNewUrlParser, useUnifiedTopology, useCreateIndex, useFindAndModify,
      // включены по умолчанию или устарели, поэтому их можно не указывать.
      // Если вы используете более старую версию Mongoose, возможно, их нужно будет добавить:
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      //
      // Можно указать имя базы данных здесь, если оно не указано в URI,
      // но в вашем URI `mongodb://localhost:27017/planetsupercell` база данных 'planetsupercell' уже указана.
      // dbName: 'planetsupercell'
    });

    // --- Сообщение об успешном подключении ---
    // mongoose.connection.host покажет, к какому хосту вы подключились (полезно для отладки)
    console.log(`Успешное подключение к MongoDB: ${mongoose.connection.host}`);

  } catch (err) {
    // --- Обработка ошибок подключения ---
    console.error('------------------------------------');
    console.error('Ошибка подключения к MongoDB!');
    console.error('Сообщение об ошибке:', err.message);
    console.error('Проверьте следующее:');
    console.error('  1. Запущен ли сервер MongoDB?');
    console.error('  2. Правильно ли указан адрес и порт в MONGO_URI?');
    console.error('  3. Если используете Atlas, добавлен ли ваш IP в список доступа?');
    console.error('  4. Правильно ли указаны имя пользователя и пароль (если они есть в URI)?');
    console.error('------------------------------------');

    // Завершаем процесс Node.js с кодом ошибки (1 обычно означает ошибку)
    process.exit(1);
  }

  // --- Дополнительные обработчики событий Mongoose (опционально, но полезно) ---

  // Срабатывает при разрыве соединения
  mongoose.connection.on('disconnected', () => {
    console.warn('Соединение с MongoDB разорвано.');
  });

  // Срабатывает при повторном успешном соединении (если был разрыв)
  mongoose.connection.on('reconnected', () => {
    console.info('Соединение с MongoDB восстановлено.');
  });

  // Срабатывает при ошибке уже после установленного соединения
  mongoose.connection.on('error', (err) => {
      console.error('Ошибка соединения MongoDB после инициализации:', err.message);
  });
};

// --- Экспорт функции ---
// Экспортируем функцию connectDB, чтобы ее можно было вызвать из основного файла сервера (например, server.js)
module.exports = connectDB;