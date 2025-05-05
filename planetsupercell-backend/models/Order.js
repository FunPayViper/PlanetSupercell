// Файл: models/Order.js
// Назначение: Определяет схему и модель Mongoose для заказов пользователей.

const mongoose = require('mongoose');

// --- Под-схема для описания одного товара в заказе ---
// Это не отдельная модель, а структура для массива items в OrderSchema
const OrderItemSchema = new mongoose.Schema({
    // Связь с конкретным товаром
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product', // Ссылка на модель Product
    },
    // Название товара на момент заказа (для истории, т.к. название в Product может измениться)
    name: {
        type: String,
        required: true,
    },
    // Количество заказанного товара
    quantity: {
        type: Number,
        required: true,
        min: 1, // Как минимум 1 товар
    },
    // Цена товара за единицу на момент заказа (для истории)
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    // Ссылка на изображение товара на момент заказа (для истории/отображения)
    image: {
        type: String,
        default: '', // По умолчанию пусто
    },
    // Флаг, показывающий, был ли оставлен отзыв именно на ЭТОТ товар В РАМКАХ ЭТОГО ЗАКАЗА
    // Можно использовать, если хотите разрешить оставлять отзывы на каждый товар в заказе отдельно
    // reviewSubmitted: { type: Boolean, default: false } // Пока не используем, используем общий флаг заказа
}, {
    _id: false // Не создаем отдельный _id для каждого элемента в массиве items
});


// --- Основная схема Заказа ---
const OrderSchema = new mongoose.Schema(
    {
        // Связь с пользователем, сделавшим заказ
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User', // Ссылка на модель User
        },
        // Массив заказанных товаров (использует под-схему OrderItemSchema)
        items: [OrderItemSchema],
        // Общая сумма заказа (рассчитывается при создании)
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        // Статус заказа
        status: {
            type: String,
            required: true,
            enum: [ // Перечисление допустимых статусов
                'pending',        // Ожидает оплаты (если оплата не сразу) - пока не используется у вас
                'paid-pending',   // Оплачен, ожидает проверки админом
                'processing',     // Заказ в обработке/выполнении
                'completed',      // Заказ успешно выполнен
                'refunded',       // Заказ отменен/возвращен
                // Можно добавить другие статусы, если нужно, например 'shipped', 'failed'
            ],
            default: 'paid-pending', // Статус по умолчанию при создании
        },
        // Путь к файлу скриншота оплаты на сервере (если используется multer)
        // Или можно хранить Data URL, но это менее эффективно и имеет ограничения по размеру
        screenshotPath: {
            type: String,
            default: null, // По умолчанию null
        },
        // Флаг, указывающий, оставил ли пользователь отзыв ПО ЭТОМУ ЗАКАЗУ
        // (Упрощенный вариант: один отзыв на весь заказ. Можно усложнить до отзыва на каждый item)
        reviewSubmitted: {
            type: Boolean,
            default: false, // По умолчанию отзыв не оставлен
        },
        // --- Дополнительные поля (если нужны) ---
        // Например, адрес доставки, комментарий к заказу, информация об оплате и т.д.
        // shippingAddress: { ... },
        // paymentMethod: { type: String },
        // paymentResult: { id: String, status: String, update_time: String, email_address: String },
        // notes: { type: String }

        // Поля createdAt и updatedAt будут добавлены автоматически
    },
    {
        timestamps: true, // Добавляет createdAt и updatedAt
    }
);

// --- Индексы ---
// Индекс по пользователю и дате - для быстрого получения заказов пользователя и сортировки
OrderSchema.index({ user: 1, createdAt: -1 });
// Индекс по статусу - для быстрой фильтрации заказов по статусу в админке
OrderSchema.index({ status: 1 });

// --- Создание и экспорт модели ---
const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;