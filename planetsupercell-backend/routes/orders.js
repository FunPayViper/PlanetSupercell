// Файл: routes/orders.js
const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');
// const upload = require('../middleware/uploadMiddleware'); // Если вы создали middleware для multer

// POST /api/orders - Создать заказ (нужен логин)
// Если используете multer: router.post('/', protect, upload.single('screenshot'), createOrder);
router.post('/', protect, createOrder); // Без multer, если path передается в body

// GET /api/orders/my - Получить свои заказы (нужен логин)
router.get('/my', protect, getMyOrders);

// GET /api/orders - Получить все заказы (только админ)
router.get('/', protect, admin, getAllOrders);

// GET /api/orders/:id - Получить заказ по ID (нужен логин, проверка прав внутри контроллера)
router.get('/:id', protect, getOrderById);

// PUT /api/orders/:id/status - Обновить статус заказа (только админ)
router.put('/:id/status', protect, admin, updateOrderStatus);

module.exports = router;