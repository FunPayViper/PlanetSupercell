// Файл: routes/reviews.js
const express = require('express');
const router = express.Router();
const {
    createReview,
    getProductReviews,
    getAllReviews,
    deleteReview
} = require('../controllers/reviewController');
const { protect, admin } = require('../middleware/authMiddleware');

// POST /api/reviews - Создать отзыв (нужен логин)
router.post('/', protect, createReview);

// GET /api/reviews?productId=... - Получить отзывы товара (публично)
// GET /api/reviews - Получить все отзывы (только админ)
router.get('/', getProductReviews); // Этот роут обработает и ?productId=...
                                   // Логику для /api/reviews (все отзывы) нужно вынести или добавить проверку прав в getProductReviews
                                   // Лучше так:
// router.get('/', getProductReviews); // Оставим для ?productId=...
// router.get('/all', protect, admin, getAllReviews); // Отдельный роут для админа

// Или объединить с проверкой прав в одном контроллере (пример ниже)
router.get('/', (req, res, next) => { // Промежуточный обработчик для выбора контроллера
    if (req.query.productId) {
        return getProductReviews(req, res, next); // Если есть productId, вызываем getProductReviews
    } else {
        // Если нет productId, считаем, что это запрос на все отзывы - проверяем права админа
        return protect(req, res, () => { admin(req, res, () => getAllReviews(req, res, next)) });
    }
});


// DELETE /api/reviews/:id - Удалить отзыв (только админ)
router.delete('/:id', protect, admin, deleteReview);

module.exports = router;