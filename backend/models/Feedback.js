const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true, maxlength: 2000 },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
