const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    startingPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ isActive: 1 });

module.exports = mongoose.model('TattooCategory', categorySchema);
