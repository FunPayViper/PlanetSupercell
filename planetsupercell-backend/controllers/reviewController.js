// Файл: controllers/reviewController.js
// Назначение: Обработка API запросов, связанных с отзывами на товары.

const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
// const User = require('../models/User'); // Не всегда нужен напрямую, т.к. user есть в req.user

// @desc    Создать новый отзыв
// @route   POST /api/reviews
// @access  Private (только залогиненные пользователи)
exports.createReview = async (req, res) => {
    const { productId, orderId, rating, text } = req.body;
    const userId = req.user.id; // Получаем ID пользователя из middleware 'protect'

    // 1. Валидация входных данных
    if (!productId || !orderId || !rating) {
        return res.status(400).json({ message: 'Пожалуйста, укажите ID товара, ID заказа и рейтинг.' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Рейтинг должен быть от 1 до 5.' });
    }

    try {
        // 2. Проверка товара
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Товар не найден.' });
        }

        // 3. Проверка заказа и права на отзыв
        const order = await Order.findOne({
            _id: orderId,
            userId: userId, // Заказ должен принадлежать текущему пользователю
            status: 'completed', // Заказ должен быть выполнен
            'items.productId': productId // Заказ должен содержать этот товар
        });

        if (!order) {
            return res.status(403).json({ message: 'Невозможно оставить отзыв. Вы не покупали этот товар или заказ не завершен.' });
        }

        // 4. Проверка, не был ли уже оставлен отзыв ИМЕННО ПО ЭТОМУ ЗАКАЗУ
        if (order.reviewSubmitted) {
             return res.status(400).json({ message: 'Вы уже оставили отзыв для этого заказа.' });
        }

        // 5. Проверка, не оставлял ли пользователь отзыв на ЭТОТ товар РАНЕЕ (по другому заказу)
        // Эту проверку можно сделать опциональной, если хотите разрешить несколько отзывов на товар от одного юзера, если он покупал его несколько раз.
        // Пока оставим - один пользователь = один отзыв на товар.
        const existingReview = await Review.findOne({ product: productId, user: userId });
        if (existingReview) {
             // Если хотите разрешить несколько отзывов, закомментируйте эту проверку
             return res.status(400).json({ message: 'Вы уже оставляли отзыв на этот товар.' });
        }


        // 6. Создание отзыва
        const review = new Review({
            user: userId,
            authorName: req.user.firstName || req.user.username || 'Аноним', // Имя из токена/профиля
            product: productId,
            order: orderId,
            rating: Number(rating),
            text: text || '', // Текст опционален
        });

        const createdReview = await review.save();

        // 7. Пометить заказ как "отзыв оставлен"
        order.reviewSubmitted = true;
        await order.save();

        // 8. (Опционально) Обновить средний рейтинг товара
        // Эта логика может быть вынесена в метод модели Product или выполняться здесь
        // await updateProductRating(productId); // Понадобится отдельная функция

        res.status(201).json(createdReview);

    } catch (error) {
        console.error('Ошибка при создании отзыва:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: `Ошибка валидации: ${error.message}` });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера при создании отзыва.' });
    }
};

// @desc    Получить все отзывы для конкретного товара
// @route   GET /api/reviews?productId=...
// @access  Public
exports.getProductReviews = async (req, res) => {
    const productId = req.query.productId;

    if (!productId) {
        return res.status(400).json({ message: 'Необходимо указать ID товара (productId).' });
    }

    try {
        const reviews = await Review.find({ product: productId })
            .populate('user', 'firstName username') // Загружаем имя и юзернейм автора
            .sort({ createdAt: -1 }); // Сначала новые

        res.json(reviews);

    } catch (error) {
        console.error('Ошибка при получении отзывов товара:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении отзывов.' });
    }
};

// @desc    Получить ВСЕ отзывы (для админ-панели)
// @route   GET /api/reviews
// @access  Private/Admin
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find({})
            .populate('user', 'firstName username telegramId') // Добавляем больше инфо об авторе
            .populate('product', 'name') // Добавляем имя товара
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('Ошибка при получении всех отзывов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении всех отзывов.' });
    }
};

// @desc    Удалить отзыв (только админ)
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res) => {
    const reviewId = req.params.id;

    try {
        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ message: 'Отзыв не найден.' });
        }

        // Находим связанный заказ, чтобы потенциально сбросить флаг reviewSubmitted
        const order = await Order.findById(review.order);

        await review.deleteOne(); // Или Review.findByIdAndDelete(reviewId);

        // Опционально: Сбросить флаг в заказе, чтобы пользователь мог оставить отзыв снова?
        // Решите, нужна ли эта логика. Если админ удалил спам, возможно, не стоит сбрасывать.
        /*
        if (order) {
            order.reviewSubmitted = false;
            await order.save();
            console.log(`Флаг reviewSubmitted сброшен для заказа ${order._id}`);
        } else {
            console.warn(`Не найден заказ ${review.order}, связанный с удаленным отзывом ${reviewId}`);
        }
        */

        // (Опционально) Обновить средний рейтинг товара после удаления
        // await updateProductRating(review.product);

        res.json({ message: 'Отзыв успешно удален.' });

    } catch (error) {
        console.error('Ошибка при удалении отзыва:', error);
        if (error.kind === 'ObjectId') {
             return res.status(404).json({ message: 'Отзыв не найден (неверный ID).' });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера при удалении отзыва.' });
    }
};


// --- Вспомогательная функция для обновления рейтинга (если нужна) ---
/*
async function updateProductRating(productId) {
    try {
        const reviews = await Review.find({ product: productId });
        const numReviews = reviews.length;
        const averageRating = numReviews > 0
            ? reviews.reduce((acc, item) => item.rating + acc, 0) / numReviews
            : 0;

        await Product.findByIdAndUpdate(productId, {
            rating: averageRating, // Предполагается, что у Product есть поле rating
            numReviews: numReviews   // И поле numReviews
        });
        console.log(`Рейтинг для товара ${productId} обновлен: ${averageRating.toFixed(1)} (${numReviews} отзывов)`);
    } catch (error) {
        console.error(`Ошибка при обновлении рейтинга товара ${productId}:`, error);
        // Эту ошибку не стоит отправлять пользователю, она фоновая
    }
}
*/