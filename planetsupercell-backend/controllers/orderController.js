// Файл: controllers/orderController.js
// Назначение: Обработка API запросов, связанных с заказами.

const Order = require('../models/Order');
const Product = require('../models/Product');
// const User = require('../models/User'); // Не всегда нужен напрямую

// @desc    Создать новый заказ
// @route   POST /api/orders
// @access  Private (Только залогиненные пользователи)
exports.createOrder = async (req, res) => {
    // userId берем из middleware 'protect', который добавляет req.user
    const userId = req.user.id;
    // items - массив объектов { productId: '...', quantity: N }
    // screenshotPath - путь к файлу, который мог быть добавлен middleware (например, multer)
    const { items, screenshotPath } = req.body; // Или req.file.path для screenshotPath

    // 1. Валидация: Проверяем наличие товаров в запросе
    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Корзина пуста. Невозможно создать заказ.' });
    }

    try {
        // 2. Получение актуальных данных о товарах из БД и проверка наличия/остатков
        const productIds = items.map(item => item.productId);
        const productsFromDB = await Product.find({ _id: { $in: productIds } });

        // Создаем Map для быстрого доступа к продуктам по ID
        const productMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

        let totalAmount = 0;
        const orderItems = []; // Массив для хранения обработанных товаров заказа

        // Перебираем товары из запроса для проверки и расчета суммы
        for (const item of items) {
            const product = productMap.get(item.productId);

            // Проверка: Найден ли товар?
            if (!product) {
                return res.status(404).json({ message: `Товар с ID ${item.productId} не найден.` });
            }

            // Проверка: Достаточно ли товара на складе?
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Недостаточно товара "${product.name}" на складе. Доступно: ${product.stock}, запрошено: ${item.quantity}.`,
                    productId: product._id,
                    availableStock: product.stock
                });
            }

            // Добавляем товар в массив заказа и считаем сумму
            orderItems.push({
                productId: product._id,
                name: product.name,
                quantity: item.quantity,
                price: product.price, // Берем актуальную цену из БД
                image: product.image || '' // Сохраняем ссылку на изображение
            });
            totalAmount += product.price * item.quantity;
        }

        // 3. Создание объекта заказа
        const order = new Order({
            user: userId,
            items: orderItems,
            totalAmount: totalAmount,
            status: 'paid-pending', // Начальный статус после "оплаты" (загрузки чека)
            screenshotPath: screenshotPath || null // Путь к скриншоту, если был загружен
            // reviewSubmitted по умолчанию false (как в модели)
        });

        // 4. Уменьшение остатков на складе (ВАЖНО: делать ПЕРЕД сохранением заказа)
        // В идеале использовать транзакции MongoDB для атомарности, но для простоты - последовательно.
        for (const item of orderItems) {
             // Используем findByIdAndUpdate для атомарного уменьшения
             // $inc оператор уменьшает значение поля на указанную величину
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
             // Здесь можно добавить дополнительную проверку, что stock не стал < 0, на всякий случай
             console.log(`Уменьшен остаток для товара ${item.name} на ${item.quantity}`);
        }

        // 5. Сохранение заказа в БД
        const createdOrder = await order.save();

        // --- Оповещение Админа (Пример - только логирование) ---
        // В реальном приложении здесь может быть отправка сообщения через Telegram Bot API
        console.log(`--- УВЕДОМЛЕНИЕ АДМИНУ ---`);
        console.log(`Новый заказ #${createdOrder._id} от пользователя ${req.user.firstName || req.user.username || userId}`);
        console.log(`Сумма: ${createdOrder.totalAmount.toFixed(2)} RUB`);
        console.log(`Скриншот: ${createdOrder.screenshotPath || 'Не загружен'}`);
        console.log(`------------------------`);
        // --- Конец оповещения ---

        res.status(201).json(createdOrder);

    } catch (error) {
        console.error('Ошибка при создании заказа:', error);
        // Если ошибка валидации Mongoose
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: `Ошибка валидации данных заказа: ${error.message}` });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера при создании заказа.' });
    }
};


// @desc    Получить заказы ТЕКУЩЕГО пользователя
// @route   GET /api/orders/my
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }); // Сначала новые
        res.json(orders);
    } catch (error) {
        console.error('Ошибка при получении заказов пользователя:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении заказов.' });
    }
};


// @desc    Получить ВСЕ заказы (для админ-панели)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
    // Добавим возможность фильтрации по статусу из query параметров
    const statusFilter = req.query.status ? { status: req.query.status } : {};

    try {
        const orders = await Order.find({ ...statusFilter })
            .populate('user', 'telegramId firstName username') // Получаем основную инфу о пользователе
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Ошибка при получении всех заказов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении всех заказов.' });
    }
};


// @desc    Получить заказ по ID
// @route   GET /api/orders/:id
// @access  Private (Пользователь может получить только свой заказ, Админ - любой)
exports.getOrderById = async (req, res) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    try {
        const order = await Order.findById(orderId).populate('user', 'telegramId firstName username');

        if (!order) {
            return res.status(404).json({ message: 'Заказ не найден.' });
        }

        // Проверка прав доступа: Админ может видеть любой заказ,
        // пользователь - только свой
        if (!isAdmin && order.user._id.toString() !== userId) {
            return res.status(403).json({ message: 'Доступ запрещен: вы не можете просматривать этот заказ.' });
        }

        res.json(order);

    } catch (error) {
        console.error('Ошибка при получении заказа по ID:', error);
        if (error.kind === 'ObjectId') {
             return res.status(404).json({ message: 'Заказ не найден (неверный формат ID).' });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении заказа.' });
    }
};


// @desc    Обновить статус заказа (только админ)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body; // Ожидаем новый статус в теле запроса

    // Список допустимых статусов
    const validStatuses = ['pending', 'paid-pending', 'processing', 'completed', 'refunded'];

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: `Неверный или отсутствующий статус. Допустимые значения: ${validStatuses.join(', ')}.` });
    }

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Заказ не найден.' });
        }

        const oldStatus = order.status;
        const newStatus = status;

        // --- Логика возврата товаров на склад при смене статуса на 'refunded' ---
        if (newStatus === 'refunded' && oldStatus !== 'refunded') {
             console.log(`Заказ ${orderId}: Смена статуса на 'refunded'. Возврат товаров на склад...`);
            for (const item of order.items) {
                try {
                     await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
                     console.log(`  - Возвращено ${item.quantity} шт. товара ${item.name} (ID: ${item.productId})`);
                } catch (stockError) {
                     // Логгируем ошибку, но продолжаем процесс (или решаем, как обрабатывать критичнее)
                     console.error(`  - Ошибка возврата товара ${item.productId} на склад:`, stockError);
                }
            }
        }
        // --- Логика списания со склада при отмене статуса 'refunded' (если нужно) ---
        // Это менее вероятно, но можно добавить проверку if (oldStatus === 'refunded' && newStatus !== 'refunded')
        // и аналогично уменьшать stock через $inc (с проверкой на >= 0).

        // Обновляем статус заказа
        order.status = newStatus;
        const updatedOrder = await order.save();

        // --- Оповещение Пользователя (Пример - только логирование) ---
        // В реальном приложении здесь может быть отправка сообщения через Telegram Bot API
        if (order.user && order.user.telegramId && newStatus !== oldStatus) {
            console.log(`--- УВЕДОМЛЕНИЕ ПОЛЬЗОВАТЕЛЮ (TG ID: ${order.user.telegramId}) ---`);
            console.log(`Статус вашего заказа #${orderId} изменен на: ${newStatus.toUpperCase()}`);
            console.log(`-------------------------------------------------------------`);
        }
        // --- Конец оповещения ---

        res.json(updatedOrder);

    } catch (error) {
        console.error('Ошибка при обновлении статуса заказа:', error);
        if (error.kind === 'ObjectId') {
             return res.status(404).json({ message: 'Заказ не найден (неверный формат ID).' });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера при обновлении статуса.' });
    }
};