// Файл: models/Category.js
// Назначение: Определяет схему и модель Mongoose для категорий товаров.

const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
    {
        // Название категории
        name: {
            type: String,
            required: [true, 'Название категории обязательно.'], // Поле обязательно
            trim: true, // Удалять пробелы по краям
            // unique: true, // Раскомментируйте, если названия категорий должны быть уникальными на глобальном уровне
        },
        // Ссылка на родительскую категорию (для построения иерархии)
        parentId: {
            type: mongoose.Schema.Types.ObjectId, // ID другого документа Category
            ref: 'Category',                      // Ссылка на эту же модель 'Category'
            default: null,                        // null означает, что это категория верхнего уровня (корневая)
        },
        // Изображение категории (URL, Data URL или Emoji)
        image: {
            type: String,
            default: '', // По умолчанию пустая строка
        },
        // Описание категории (опционально)
        description: {
            type: String,
            trim: true,
            default: '',
        },
        // --- Дополнительные поля (если нужны) ---
        // Например, порядок сортировки, флаг активности и т.д.
        // sortOrder: { type: Number, default: 0 },
        // isActive: { type: Boolean, default: true },

        // Поля createdAt и updatedAt будут добавлены автоматически
    },
    {
        timestamps: true, // Добавляет createdAt и updatedAt
        // --- Виртуальные поля (опционально) ---
        // Можно добавить виртуальное поле для получения информации о том, корневая ли категория
        // virtuals: {
        //     isRoot: {
        //         get() {
        //             return this.parentId === null;
        //         }
        //     }
        // },
        // toJSON: { virtuals: true },
        // toObject: { virtuals: true }
    }
);

// --- Индексы ---
// Индекс по parentId - для быстрого поиска дочерних категорий
CategorySchema.index({ parentId: 1 });
// Индекс по имени - для поиска или сортировки по имени
CategorySchema.index({ name: 1 });


// --- Middleware (Предосторожности перед удалением - ОПЦИОНАЛЬНО) ---
// Можно добавить middleware 'pre remove', чтобы, например, запретить удаление категории,
// если у нее есть дочерние категории или связанные товары.
// Однако, логику каскадного удаления или проверки лучше размещать в контроллере (categoryController.js),
// так как там больше контекста запроса.

/* Пример middleware pre remove (НЕ РЕКОМЕНДУЕТСЯ для сложной логики каскадного удаления):
CategorySchema.pre('remove', async function(next) {
    try {
        // Проверяем наличие дочерних категорий
        const childCount = await mongoose.model('Category').countDocuments({ parentId: this._id });
        if (childCount > 0) {
            return next(new Error(`Нельзя удалить категорию "${this.name}", так как у нее есть подкатегории.`));
        }

        // Проверяем наличие товаров в этой категории
        const productCount = await mongoose.model('Product').countDocuments({ categoryId: this._id });
        if (productCount > 0) {
             return next(new Error(`Нельзя удалить категорию "${this.name}", так как она содержит товары.`));
        }
        next(); // Если провеки пройдены, разрешаем удаление
    } catch (error) {
        next(error);
    }
});
*/


// --- Создание и экспорт модели ---
// mongoose.model('Category', CategorySchema) создает модель с именем 'Category'
// В базе данных MongoDB будет создана коллекция 'categories'.
const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;