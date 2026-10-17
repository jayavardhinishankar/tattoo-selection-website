const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const admin = require('../controllers/adminController');
const customer = require('../controllers/customerController');
const { protect, requireAdminRole } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const aiNameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI name requests. Please try again later.' },
});

// Public admin endpoints (no token needed to attempt login or to clear a cookie)
router.post('/login', loginLimiter, auth.login);
router.post('/logout', auth.logout);

// Everything below requires a valid admin session
router.use(protect, requireAdminRole);

router.get('/me', auth.me);
router.get('/dashboard', admin.dashboard);

router.get('/feedback', customer.listFeedback);
router.patch('/feedback/:id/status', customer.updateFeedbackStatus);
router.delete('/feedback/:id', customer.deleteFeedback);

router.get('/lettering-requests', customer.listLetteringRequests);
router.get('/lettering-requests/:id', customer.getLetteringRequest);
router.patch('/lettering-requests/:id', customer.updateLetteringRequest);
router.delete('/lettering-requests/:id', customer.deleteLetteringRequest);

router.get('/tattoos', admin.listTattoos);
router.get('/tattoos/:id', admin.getTattoo);
router.post('/tattoos/suggest-name', aiNameLimiter, uploadSingleImage, admin.suggestTattooName);
router.post('/tattoos', uploadSingleImage, admin.createTattoo);
router.put('/tattoos/:id', uploadSingleImage, admin.updateTattoo);
router.delete('/tattoos/:id', admin.deleteTattoo);

router.get('/categories', admin.listCategories);
router.post('/categories', admin.createCategory);
router.put('/categories/:id', admin.updateCategory);
router.delete('/categories/:id', admin.deleteCategory);

module.exports = router;
