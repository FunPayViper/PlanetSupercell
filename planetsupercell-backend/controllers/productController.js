// Файл: controllers/productController.js
// Назначение: Обработка API запросов, связанных с товарами.

const asyncHandler = require('express-async-handler'); // Обработчик для async функций
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order'); // Нужен для проверки перед удалением
const Review = require('../models/Review'); // Нужен для каскадного удаления отзывов

// @desc    Получить все товары (с фильтрацией и пагинацией)
// @route   GET /api/products
// @access  Public
exports.getAllProducts = asyncHandler(async (req, res) => {
    const pageSize = 12; // Количество товаров на странице (можно сделать настраиваемым)
    const page = Number(req.query.pageNumber) || 1; // Текущая страница

    // Фильтрация по категории
    const categoryId = req.query.categoryId;
    let categoryFilter = {};
    if (categoryId) {
        // TODO: Если нужна полная иерархия, нужно найти ID всех подкатегорий
        // const descendantIds = await getAllDescendantIds(categoryId); // Потребуется вспомогательная функция
        // categoryFilter = { categoryId: { $in: [categoryId, ...descendantIds] } };
        // Пока фильтруем только по прямому ID
        categoryFilter = { categoryId: categoryId };
    }

    // Фильтрация по поисковому запросу (простой поиск по имени)
    const keyword = req.query.keyword
        ? {
              name: {
                  $regex: req.query.keyword, // Используем регулярное выражение
                  $options: 'i', // 'i' - нечувствительность к регистру
              },
          }
        : {};

    // Объединяем все фильтры
    const filter = { ...keyword, ...categoryFilter };

    // Считаем общее количество товаров, подходящих под фильтры
    const count = await Product.countDocuments(filter);

    // Находим товары для текущей страницы с фильтрами и сортировкой
    const products = await Product.find(filter)
        .populate('categoryId', 'name') // Добавляем имя категории
        .limit(pageSize) // Ограничиваем количество на странице
        .skip(pageSize * (page - 1)) // Пропускаем товары предыдущих страниц
        .sort({ createdAt: -1 }); // Сортируем по дате создания (или 'name' для алфавитного)

    // Отправляем товары, номер страницы и общее количество страниц
    res.json({
        products,
        page,
        pages: Math.ceil(count / pageSize), // Общее количество страниц
        count // Общее количество найденных товаров
    });
});

// @desc    Получить товар по ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name');

    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Товар не найден');
    }
});

// @desc    Создать новый товар
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res) => {
    // Извлекаем данные из тела запроса
    const {
        name,
        price,
        description = '', // Значения по умолчанию
        image = '',
        stock = 0,
        categoryId,
        oldPrice = null,
    } = req.body;

    // --- Валидация ---
    if (!name || !price || !categoryId) {
        res.status(400);
        throw new Error('Пожалуйста, укажите название, цену и категорию товара.');
    }
    if (isNaN(price) || price <= 0) {
        res.status(400); throw new Error('Цена должна быть положительным числом.');
    }
    if (isNaN(stock) || stock < 0) {
        res.status(400); throw new Error('Остаток не может быть отрицательным.');
    }
    if (oldPrice !== null && (isNaN(oldPrice) || oldPrice < 0)) {
        res.status(400); throw new Error('Старая цена должна быть числом не меньше 0.');
    }
     if (oldPrice !== null && oldPrice <= price) {
        res.status(400); throw new Error('Старая цена должна быть больше текущей цены.');
    }

    // Проверка существования категории
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
        res.status(400);
        throw new Error(`Категория с ID ${categoryId} не найдена.`);
    }
    // --- Конец валидации ---

    // Создаем новый товар
    const product = new Product({
        user: req.user.id, // Добавляем ID админа, который создал товар
        name,
        price: Number(price),
        description,
        image, // Путь к изображению (предполагается, что он обработан отдельно, если была загрузка)
        stock: Number(stock),
        categoryId,
        oldPrice: oldPrice ? Number(oldPrice) : null,
        // Поля rating, numReviews будут обновляться отдельно (например, при добавлении отзыва)
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});

// @desc    Обновить товар
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res) => {
    const {
        name,
        price,
        description,
        image,
        stock,
        categoryId,
        oldPrice,
    } = req.body;
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
        res.status(404);
        throw new Error('Товар не найден');
    }

    // --- Валидация входных данных (если они переданы) ---
    if (price !== undefined && (isNaN(price) || price <= 0)) {
        res.status(400); throw new Error('Цена должна быть положительным числом.');
    }
    if (stock !== undefined && (isNaN(stock) || stock < 0)) {
        res.status(400); throw new Error('Остаток не может быть отрицательным.');
    }
    const currentPrice = price !== undefined ? Number(price) : product.price;
    const currentOldPrice = oldPrice !== undefined ? (oldPrice ? Number(oldPrice) : null) : product.oldPrice;

    if (currentOldPrice !== null && (isNaN(currentOldPrice) || currentOldPrice < 0)) {
        res.status(400); throw new Error('Старая цена должна быть числом не меньше 0.');
    }
    if (currentOldPrice !== null && currentOldPrice <= currentPrice) {
         res.status(400); throw new Error('Старая цена должна быть больше текущей цены.');
    }
    if (categoryId) {
        const categoryExists = await Category.findById(categoryId);
        if (!categoryExists) {
            res.status(400);
            throw new Error(`Категория с ID ${categoryId} не найдена.`);
        }
         product.categoryId = categoryId; // Обновляем категорию только если проверка прошла
    }
    // --- Конец валидации ---


    // Обновляем поля товара, если они были переданы в запросе
    product.name = name || product.name;
    product.price = price !== undefined ? Number(price) : product.price;
    product.description = description !== undefined ? description : product.description;
    product.image = image !== undefined ? image : product.image;
    product.stock = stock !== undefined ? Number(stock) : product.stock;
    product.oldPrice = oldPrice !== undefined ? (oldPrice ? Number(oldPrice) : null) : product.oldPrice;
    // Поля user, rating, numReviews обычно не меняются здесь

    const updatedProduct = await product.save();
    res.json(updatedProduct);
});

// @desc    Удалить товар
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res) => {
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
        res.status(404);
        throw new Error('Товар не найден');
    }

    // --- Критически важная проверка: нет ли товара в активных заказах ---
    const activeOrdersExist = await Order.findOne({
        'items.productId': productId, // Ищем товар в массиве items
        status: { $nin: ['completed', 'refunded'] } // Статус НЕ 'completed' И НЕ 'refunded'
    });

    if (activeOrdersExist) {
        res.status(400);
        throw new Error(`Нельзя удалить товар "${product.name}", так как он присутствует в активных заказах (ID заказа: ${activeOrdersExist._id}). Сначала завершите или отмените заказ.`);
    }
    // --- Конец проверки ---

    // Удаление связанных отзывов (если нужно)
    const reviewDeleteResult = await Review.deleteMany({ product: productId });
    console.log(`Удалено связанных отзывов: ${reviewDeleteResult.deletedCount}`);

    // Удаление самого товара
    await product.deleteOne(); // Или Product.findByIdAndDelete(productId);

    res.json({ message: `Товар "${product.name}" и ${reviewDeleteResult.deletedCount} связанных отзывов удалены.` });
});