const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const customer = require('../controllers/customerController');
const { uploadSingleImage } = require('../middleware/upload');

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
});

router.post('/feedback', submissionLimiter, uploadSingleImage, customer.submitFeedback);
router.get('/feedback/approved', customer.listApprovedFeedback);
router.post('/lettering-requests', submissionLimiter, customer.submitLetteringRequest);

module.exports = router;
