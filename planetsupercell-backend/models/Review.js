// Файл: models/Review.js
// Назначение: Определяет схему и модель Mongoose для отзывов пользователей.

const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
    {
        // Связь с пользователем, оставившим отзыв
        user: {
            type: mongoose.Schema.Types.ObjectId, // Тип данных - ID объекта MongoDB
            required: true,                       // Поле обязательно
            ref: 'User',                          // Ссылка на модель 'User'
        },
        // Связь с товаром, на который оставлен отзыв
        product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Product',                       // Ссылка на модель 'Product'
        },
        // Связь с заказом, в рамках которого был куплен товар (для проверки права на отзыв)
        order: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Order',                         // Ссылка на модель 'Order'
        },
        // Имя автора на момент написания отзыва (для удобства, чтобы не делать лишний populate)
        authorName: {
            type: String,
            required: true, // Заполняется из данных req.user при создании
        },
        // Рейтинг, поставленный пользователем
        rating: {
            type: Number,
            required: true, // Обязательное поле
            min: 1,         // Минимальное значение
            max: 5,         // Максимальное значение
        },
        // Текст отзыва (комментарий)
        text: {
            type: String,
            trim: true,     // Удалять пробелы по краям
            default: '',    // По умолчанию пустая строка, если текст не оставлен
        },
        // Поля createdAt и updatedAt будут добавлены автоматически благодаря опции timestamps
    },
    {
        timestamps: true, // Автоматически добавляет поля createdAt и updatedAt
    }
);

// --- Индексы (для оптимизации запросов) ---

// Индекс по товару и пользователю - полезен для проверки, оставлял ли юзер уже отзыв на товар
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
// unique: true - гарантирует, что комбинация товара и пользователя будет уникальной.
// ЗАКОММЕНТИРУЙТЕ `{ unique: true }` или весь индекс, если хотите разрешить
// пользователю оставлять несколько отзывов на один товар (например, по разным заказам).

// Индекс по товару и дате создания - для быстрой сортировки отзывов товара по дате
ReviewSchema.index({ product: 1, createdAt: -1 });

// Индекс по заказу - может быть полезен для связи с заказом, но используется реже
ReviewSchema.index({ order: 1 });


// --- Статические методы или Middleware (опционально) ---

// Например, можно добавить middleware 'post save' или 'post remove' для автоматического
// пересчета среднего рейтинга у связанного товара (Product).
// Это более продвинутая техника, требующая добавления полей rating и numReviews в модель Product.

/* Пример логики для обновления рейтинга товара ПОСЛЕ сохранения отзыва:
ReviewSchema.post('save', async function() {
    // 'this' ссылается на сохраненный документ Review
    await this.constructor.calculateAverageRating(this.product);
});

// И ПОСЛЕ удаления отзыва
ReviewSchema.post('remove', async function() {
    await this.constructor.calculateAverageRating(this.product);
});

// Статический метод для модели Review для вычисления рейтинга
ReviewSchema.statics.calculateAverageRating = async function(productId) {
    try {
        const stats = await this.aggregate([
            { $match: { product: productId } }, // Найти все отзывы для этого продукта
            {
                $group: {
                    _id: '$product',             // Сгруппировать по ID продукта
                    numReviews: { $sum: 1 },     // Посчитать количество отзывов
                    avgRating: { $avg: '$rating' } // Вычислить средний рейтинг
                }
            }
        ]);

        // Обновить документ Product соответствующими значениями
        if (stats.length > 0) {
            await mongoose.model('Product').findByIdAndUpdate(productId, {
                rating: stats[0].avgRating,
                numReviews: stats[0].numReviews
            });
        } else {
            // Если отзывов нет, сбросить рейтинг
            await mongoose.model('Product').findByIdAndUpdate(productId, {
                rating: 0,
                numReviews: 0
            });
        }
         console.log(`Рейтинг для товара ${productId} обновлен.`);
    } catch (err) {
        console.error(`Ошибка при пересчете рейтинга для товара ${productId}:`, err);
    }
};
*/


// --- Создание и экспорт модели ---
// mongoose.model('Review', ReviewSchema) создает модель с именем 'Review'
// на основе схемы ReviewSchema. В базе данных MongoDB будет создана коллекция 'reviews'.
const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;