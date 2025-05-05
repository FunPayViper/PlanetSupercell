// Файл: models/User.js
// Назначение: Определяет схему и модель Mongoose для пользователей приложения.

const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs'); // Раскомментируйте, если будете добавлять пароль

const UserSchema = new mongoose.Schema(
    {
        // Основной идентификатор из Telegram
        telegramId: {
            type: Number,
            required: true, // Обязательное поле
            unique: true,   // Уникальное значение, не может быть двух пользователей с одинаковым TG ID
            index: true,    // Добавляем индекс для быстрого поиска по telegramId
        },
        // Имя пользователя из Telegram
        firstName: {
            type: String,
            required: true, // Сделаем обязательным, чтобы было хоть какое-то имя
            trim: true,
        },
        // Фамилия пользователя из Telegram (опционально)
        lastName: {
            type: String,
            trim: true,
            default: '', // По умолчанию пустая строка
        },
        // Юзернейм пользователя из Telegram (@username) (опционально)
        username: {
            type: String,
            trim: true,
            default: '', // По умолчанию пустая строка
            // unique: true, // Можно сделать уникальным, если нужно, но у пользователей может не быть юзернейма
            // sparse: true // Нужно добавить sparse: true, если поле unique, но не required
        },
        // Флаг, указывающий, является ли пользователь администратором
        isAdmin: {
            type: Boolean,
            required: true, // Обязательное поле
            default: false, // По умолчанию пользователь не является админом
        },
        // --- Поля для стандартной аутентификации (если нужна) ---
        // Если вы захотите добавить возможность входа по email/паролю (например, для админа через веб-интерфейс),
        // можно раскомментировать и добавить эти поля.

        /*
        email: {
            type: String,
            unique: true,
            sparse: true, // Позволяет иметь несколько null или отсутствующих значений, но только одно уникальное значение email
            // match: [/.+@.+\..+/, 'Пожалуйста, введите корректный email'] // Валидация формата
        },
        password: {
            type: String,
            // select: false // По умолчанию не возвращать поле пароля при запросах find()
        },
        */

        // --- Дополнительные поля (если нужны) ---
        // Например, язык пользователя, дата последней активности и т.д.
        // languageCode: { type: String, default: 'ru' },
        // lastActivityAt: { type: Date, default: Date.now }

        // Поля createdAt и updatedAt будут добавлены автоматически
    },
    {
        timestamps: true, // Автоматически добавляет createdAt и updatedAt
        // --- Виртуальные поля (опционально) ---
        // Можно добавить виртуальное поле для полного имени
        // virtuals: {
        //     fullName: {
        //         get() {
        //             return `${this.firstName} ${this.lastName || ''}`.trim();
        //         },
        //         set(v) {
        //             const firstSpace = v.indexOf(' ');
        //             if (firstSpace === -1) {
        //                 this.firstName = v;
        //                 this.lastName = '';
        //             } else {
        //                 this.firstName = v.substring(0, firstSpace);
        //                 this.lastName = v.substring(firstSpace + 1);
        //             }
        //         }
        //     }
        // },
        // toJSON: { virtuals: true }, // Включать виртуальные поля при преобразовании в JSON
        // toObject: { virtuals: true } // Включать виртуальные поля при преобразовании в объект
    }
);


// --- Middleware для хеширования пароля (если используется) ---
// Выполняется перед сохранением документа (save())
/* Раскомментируйте, если добавили поле password
UserSchema.pre('save', async function (next) {
    // Хешируем пароль, только если он был изменен (или это новый пользователь)
    if (!this.isModified('password')) {
        return next(); // Если пароль не менялся, идем дальше
    }

    try {
        // Генерируем "соль" для хеширования
        const salt = await bcrypt.genSalt(10); // 10 - сложность хеширования (рекомендуемое значение)
        // Хешируем пароль с использованием соли
        this.password = await bcrypt.hash(this.password, salt);
        next(); // Передаем управление дальше
    } catch (error) {
        next(error); // Передаем ошибку в обработчик ошибок Express
    }
});
*/

// --- Метод для сравнения введенного пароля с хешированным (если используется) ---
/* Раскомментируйте, если добавили поле password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    // 'this.password' - это хешированный пароль из базы данных
    return await bcrypt.compare(enteredPassword, this.password);
};
*/


// --- Создание и экспорт модели ---
const User = mongoose.model('User', UserSchema);

module.exports = User;