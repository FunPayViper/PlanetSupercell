// Файл: routes/categories.js
const express = require('express');
const router = express.Router();
const {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/categories - Получить все категории (публично)
router.get('/', getAllCategories);

// GET /api/categories/:id - Получить категорию по ID (публично)
router.get('/:id', getCategoryById);

// POST /api/categories - Создать категорию (только админ)
router.post('/', protect, admin, createCategory);

// PUT /api/categories/:id - Обновить категорию (только админ)
router.put('/:id', protect, admin, updateCategory);

// DELETE /api/categories/:id - Удалить категорию (только админ)
router.delete('/:id', protect, admin, deleteCategory);

module.exports = router;