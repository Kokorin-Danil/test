import multer from 'multer';
import path from 'path';
import uniqid from 'uniqid';
import fs from 'fs'; // Подключаем модуль fs

// Папка для загрузки файлов
const uploadDir = path.join('public', 'uploads');

// Убедимся, что папка существует
if (!fs.existsSync(uploadDir)) {
  // Исправлено: используем fs.existsSync
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Конфигурация хранения файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Указываем папку для загрузки файлов
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname); // Получаем расширение файла
    const uniqueId = uniqid(); // Генерируем уникальный идентификатор
    cb(null, `${uniqueId}${extension}`); // Задаем уникальное имя для файла
  },
});

// Функция для проверки формата файла
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']; // Допустимые MIME-типы
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Разрешить файл
  } else {
    cb(new Error('Only .jpg, .jpeg, and .png formats are allowed'), false); // Отклонить файл
  }
};

// Экспортируем multer с конфигурацией
const upload = multer({
  storage: storage,
  fileFilter: fileFilter, // Применяем проверку формата файла
});

export default upload;
