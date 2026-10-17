const crypto = require('crypto');
const mongoose = require('mongoose');

const designSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      maxlength: 2,
      validate: {
        validator: (value) => Array.from(value).length === 1 && /^\p{L}$/u.test(value),
        message: 'Design text must be exactly one alphabetic letter',
      },
    },
    letterCase: { type: String, enum: ['original', 'uppercase', 'lowercase'], default: 'original' },
    fontFamily: { type: String, required: true, maxlength: 80 },
    fontCategory: { type: String, required: true, maxlength: 40 },
    fontWeight: { type: Number, required: true, min: 100, max: 900 },
    italic: { type: Boolean, default: false },
    fontSize: { type: Number, required: true, min: 8, max: 240 },
    letterSpacing: { type: Number, required: true, min: -5, max: 30 },
    lineSpacing: { type: Number, required: true, min: 0.8, max: 3 },
    alignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#111111' },
  },
  { _id: false }
);

const letteringRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, unique: true, default: () => crypto.randomUUID() },
    customerName: { type: String, trim: true, maxlength: 100, default: '' },
    rollNumber: { type: String, trim: true, maxlength: 40, default: '' },
    contact: { type: String, trim: true, maxlength: 254, default: '' },
    design: { type: designSchema, required: true },
    placement: { type: String, trim: true, maxlength: 100, default: '' },
    width: { type: Number, min: 0, max: 1000, default: null },
    height: { type: Number, min: 0, max: 1000, default: null },
    sizeUnit: { type: String, enum: ['cm', 'in'], default: 'cm' },
    instructions: { type: String, maxlength: 2000, default: '' },
    suggestAdjustments: { type: Boolean, default: false },
    svg: { type: String, required: true, maxlength: 20000 },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'approved', 'rejected', 'completed'],
      default: 'pending',
      index: true,
    },
    internalNotes: { type: String, maxlength: 4000, default: '' },
  },
  { timestamps: true }
);

letteringRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LetteringRequest', letteringRequestSchema);
