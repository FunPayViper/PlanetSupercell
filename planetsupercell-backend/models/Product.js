// Файл: models/Product.js
// Назначение: Определяет схему и модель Mongoose для товаров магазина.

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
    {
        // Пользователь (Админ), который добавил товар
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true, // Поле обязательно, чтобы знать, кто добавил
            ref: 'User',    // Ссылка на модель User
        },
        // Название товара
        name: {
            type: String,
            required: [true, 'Название товара обязательно.'],
            trim: true,
        },
        // Ссылка на категорию товара
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Категория товара обязательна.'], // Сделаем категорию обязательной
            ref: 'Category', // Ссылка на модель Category
        },
        // Описание товара
        description: {
            type: String,
            trim: true,
            default: '',
        },
        // Изображение товара (URL или путь на сервере)
        image: {
            type: String,
            default: '',
        },
        // Текущая цена товара
        price: {
            type: Number,
            required: [true, 'Цена товара обязательна.'],
            min: [0.01, 'Цена должна быть больше 0.'], // Минимальная цена
        },
        // Старая цена (для отображения скидки)
        oldPrice: {
            type: Number,
            min: [0, 'Старая цена не может быть отрицательной.'], // Минимальное значение 0
            default: null, // null означает, что старой цены нет
            // Дополнительная валидация (не обязательная на уровне схемы, но полезная):
            // Старая цена должна быть больше текущей цены, если она указана.
            // Эту проверку лучше делать в контроллере перед сохранением.
            // validate: [
            //     function(value) {
            //         // this.price доступен здесь
            //         return value === null || value > this.price;
            //     },
            //     'Старая цена должна быть больше текущей цены.'
            // ]
        },
        // Количество товара на складе
        stock: {
            type: Number,
            required: [true, 'Остаток на складе обязателен.'],
            min: [0, 'Остаток не может быть отрицательным.'],
            default: 0,
        },
        // --- Поля для рейтинга (обновляются при добавлении/удалении отзывов) ---
        // Средний рейтинг товара
        rating: {
            type: Number,
            required: true, // Сделаем обязательным для консистентности
            default: 0,     // По умолчанию 0
            min: 0,
            max: 5,
        },
        // Количество отзывов на товар
        numReviews: {
            type: Number,
            required: true, // Сделаем обязательным
            default: 0,     // По умолчанию 0
            min: 0,
        },
        // --- Дополнительные поля (если нужны) ---
        // Например, бренд, характеристики, артикул и т.д.
        // brand: { type: String },
        // specifications: { type: Map, of: String }, // Для пар ключ-значение характеристик
        // sku: { type: String, unique: true, sparse: true }

        // Поля createdAt и updatedAt будут добавлены автоматически
    },
    {
        timestamps: true, // Добавляет createdAt и updatedAt
    }
);

// --- Индексы ---
// Индекс по имени (для поиска и сортировки)
ProductSchema.index({ name: 1 });
// Индекс по категории (для фильтрации)
ProductSchema.index({ categoryId: 1 });
// Индекс по цене (для сортировки/фильтрации по цене)
ProductSchema.index({ price: 1 });
// Текстовый индекс для полнотекстового поиска (опционально)
// ProductSchema.index({ name: 'text', description: 'text' });
// Использование: Product.find({ $text: { $search: "ключевое слово" } })


// --- Создание и экспорт модели ---
// mongoose.model('Product', ProductSchema) создает модель с именем 'Product'
// В базе данных MongoDB будет создана коллекция 'products'.
const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;