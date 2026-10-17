const mongoose = require('mongoose');

const tattooSchema = new mongoose.Schema(
  {
    tattooNumber: { type: Number, required: true, unique: true, immutable: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TattooCategory', required: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    // Used to delete the file from Cloudinary / local disk when replaced or removed.
    imagePublicId: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tattooSchema.index({ categoryId: 1, isActive: 1 });
tattooSchema.index({ isActive: 1, tattooNumber: 1 });
tattooSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Tattoo', tattooSchema);
