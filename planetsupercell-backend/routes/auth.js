// Файл: routes/auth.js
const express = require('express');
const router = express.Router();
const { verifyTelegramAuth } = require('../controllers/authController');

// POST /api/auth/telegram - Роут для верификации данных от Telegram
router.post('/telegram', verifyTelegramAuth);

module.exports = router;