const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const maxBytes = () => (Number(process.env.MAX_IMAGE_MB) || 5) * 1024 * 1024;

// Memory storage: the buffer is then pushed to persistent storage (Cloudinary,
// or the local uploads folder in development). Nothing temporary is left behind.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes(), files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPG, PNG or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

const uploadSingleImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, `Image is too large. Maximum size is ${process.env.MAX_IMAGE_MB || 5} MB`));
      }
      return next(new ApiError(400, `Upload error: ${err.message}`));
    }
    next(err);
  });
};

module.exports = { uploadSingleImage };
