// Файл: controllers/categoryController.js
// Назначение: Обработка API запросов, связанных с категориями товаров.

const asyncHandler = require('express-async-handler'); // Middleware для обработки ошибок в async функциях
const Category = require('../models/Category');
const Product = require('../models/Product'); // Нужен для каскадного удаления товаров

// --- Вспомогательная функция для рекурсивного получения ID всех подкатегорий ---
const getAllDescendantIds = async (parentId) => {
    let ids = [];
    // Находим прямых потомков
    const children = await Category.find({ parentId: parentId }).select('_id'); // Выбираем только ID
    for (const child of children) {
        ids.push(child._id);
        // Рекурсивно получаем потомков для каждого ребенка
        const descendantIds = await getAllDescendantIds(child._id);
        ids = ids.concat(descendantIds);
    }
    return ids;
};

// --- Вспомогательная функция для проверки, является ли potentialChildId потомком ancestorId ---
const isDescendant = async (potentialChildId, ancestorId) => {
    if (!potentialChildId) return false; // Дочерний ID не может быть null/undefined
    if (potentialChildId.toString() === ancestorId.toString()) return true; // Сам себе потомок (для проверки при обновлении)

    const child = await Category.findById(potentialChildId).select('parentId'); // Нам нужно только поле parentId
    if (!child || !child.parentId) {
        return false; // Дошли до корневой категории или категория не найдена
    }
    if (child.parentId.toString() === ancestorId.toString()) {
        return true; // Нашли предка
    }
    // Рекурсивно идем вверх по дереву
    return await isDescendant(child.parentId, ancestorId);
};


// @desc    Получить все категории (плоский список)
// @route   GET /api/categories
// @access  Public
exports.getAllCategories = asyncHandler(async (req, res) => {
    // Получаем все категории, сортируем по имени для удобства
    // Фронтенд сам построит дерево из этого плоского списка, используя parentId
    const categories = await Category.find({}).sort('name');
    res.json(categories);
});

// @desc    Получить категорию по ID
// @route   GET /api/categories/:id
// @access  Public
exports.getCategoryById = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (category) {
        res.json(category);
    } else {
        res.status(404);
        throw new Error('Категория не найдена');
    }
});

// @desc    Создать новую категорию
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = asyncHandler(async (req, res) => {
    const { name, parentId, image } = req.body;

    if (!name) {
        res.status(400);
        throw new Error('Название категории обязательно для заполнения.');
    }

    // Проверка: существует ли уже категория с таким именем (опционально, можно разрешить)
    // const categoryExists = await Category.findOne({ name });
    // if (categoryExists) {
    //     res.status(400);
    //     throw new Error('Категория с таким именем уже существует');
    // }

    // Проверка: если указан parentId, существует ли такая родительская категория
    if (parentId) {
        const parentExists = await Category.findById(parentId);
        if (!parentExists) {
            res.status(400);
            throw new Error(`Родительская категория с ID ${parentId} не найдена.`);
        }
    }

    const category = new Category({
        name,
        parentId: parentId || null, // Если parentId не передан, устанавливаем null
        image: image || '', // Путь к изображению или Emoji
        // createdBy: req.user.id // Можно добавить ID админа, создавшего категорию
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
});

// @desc    Обновить категорию
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = asyncHandler(async (req, res) => {
    const { name, parentId, image } = req.body;
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);

    if (!category) {
        res.status(404);
        throw new Error('Категория не найдена');
    }

    // --- Важная проверка на цикличность ---
    if (parentId) {
        // Нельзя сделать категорию дочерней самой себе
        if (parentId === categoryId) {
            res.status(400);
            throw new Error('Категория не может быть родительской для самой себя.');
        }
        // Нельзя сделать категорию дочерней для одного из своих потомков
        const checkDescendant = await isDescendant(parentId, categoryId);
        if (checkDescendant) {
            res.status(400);
            throw new Error('Нельзя сделать категорию дочерней для одного из своих потомков (циклическая зависимость).');
        }
        // Проверка существования нового родителя
        const parentExists = await Category.findById(parentId);
        if (!parentExists) {
            res.status(400);
            throw new Error(`Новая родительская категория с ID ${parentId} не найдена.`);
        }
        category.parentId = parentId;
    } else if (parentId === null || parentId === '') { // Позволяем сделать категорию корневой
        category.parentId = null;
    } // Если parentId не передан в req.body, он не изменяется

    // Обновляем остальные поля, если они переданы
    category.name = name || category.name;
    category.image = image !== undefined ? image : category.image; // Позволяем установить пустую строку

    const updatedCategory = await category.save();
    res.json(updatedCategory);
});

// @desc    Удалить категорию (и все ее подкатегории и связанные товары)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = asyncHandler(async (req, res) => {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);

    if (!category) {
        res.status(404);
        throw new Error('Категория не найдена');
    }

    // 1. Найти все ID для удаления (категория + все потомки)
    const descendantIds = await getAllDescendantIds(categoryId);
    const allCategoryIdsToDelete = [categoryId, ...descendantIds];

    // ВАЖНО: В реальном приложении здесь нужна проверка,
    // нет ли товаров из этих категорий в АКТИВНЫХ заказах.
    // Если есть, удаление стоит запретить или обрабатывать иначе.
    // const activeOrdersExist = await Order.findOne({ 'items.productId': { $in: productIdsToDelete }, status: { $nin: ['completed', 'refunded'] } });
    // if (activeOrdersExist) {
    //     res.status(400);
    //     throw new Error('Нельзя удалить категорию, так как товары из нее присутствуют в активных заказах.');
    // }

    // 2. Удалить все товары, принадлежащие этим категориям
    const deleteProductResult = await Product.deleteMany({ categoryId: { $in: allCategoryIdsToDelete } });
    console.log(`Удалено товаров: ${deleteProductResult.deletedCount}`);

    // 3. Удалить все найденные категории (целевую и потомков)
    const deleteCategoryResult = await Category.deleteMany({ _id: { $in: allCategoryIdsToDelete } });
    console.log(`Удалено категорий: ${deleteCategoryResult.deletedCount}`);

    // TODO: Подумать об удалении связанных отзывов (если товары удалены)
    // await Review.deleteMany({ product: { $in: productIdsToDelete } });

    res.json({ message: `Категория '${category.name}' и ${deleteCategoryResult.deletedCount - 1} подкатегорий, а также ${deleteProductResult.deletedCount} связанных товаров были удалены.` });
});