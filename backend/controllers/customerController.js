const Feedback = require('../models/Feedback');
const LetteringRequest = require('../models/LetteringRequest');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { requireObjectId, escapeRegex } = require('../utils/validators');
const { saveImage, deleteImage, hasImageSignature } = require('../services/imageService');

const FEEDBACK_STATUSES = ['pending', 'approved', 'rejected'];
const REQUEST_STATUSES = ['pending', 'reviewing', 'approved', 'rejected', 'completed'];
const ALIGNMENTS = ['left', 'center', 'right'];
const SIZE_UNITS = ['cm', 'in'];

function requiredText(value, label, max) {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${label} is required`);
  if (value.length > max) throw new ApiError(400, `${label} must be at most ${max} characters`);
  return value;
}

function optionalText(value, label, max) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new ApiError(400, `${label} must be text`);
  if (value.length > max) throw new ApiError(400, `${label} must be at most ${max} characters`);
  return value;
}

function finiteNumber(value, label, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new ApiError(400, `${label} must be between ${min} and ${max}`);
  return n;
}

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[char]);
}

function createSvg(design) {
  const sourceText = design.letterCase === 'uppercase' ? design.text.toUpperCase() : design.letterCase === 'lowercase' ? design.text.toLowerCase() : design.text;
  const lines = sourceText.split(/\r?\n/);
  const width = 1200;
  const height = Math.max(300, Math.ceil(lines.length * design.fontSize * design.lineSpacing + 100));
  const x = design.alignment === 'left' ? 40 : design.alignment === 'right' ? width - 40 : width / 2;
  const anchor = design.alignment === 'left' ? 'start' : design.alignment === 'right' ? 'end' : 'middle';
  const text = lines.map((line, index) =>
    `<tspan x="${x}" dy="${index === 0 ? 0 : design.fontSize * design.lineSpacing}">${xmlEscape(line)}</tspan>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="${x}" y="${50 + design.fontSize}" font-family="${xmlEscape(design.fontFamily)}" font-size="${design.fontSize}px" font-weight="${design.fontWeight}" font-style="${design.italic ? 'italic' : 'normal'}" letter-spacing="${design.letterSpacing}px" text-anchor="${anchor}" fill="${design.color}">${text}</text></svg>`;
}

function cleanDesign(body) {
  const text = requiredText(body.text, 'Design letter', 2);
  if (Array.from(text).length !== 1 || !/^\p{L}$/u.test(text)) {
    throw new ApiError(400, 'Enter exactly one alphabetic letter. Words and numbers are not accepted.');
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(text)) throw new ApiError(400, 'Design text contains unsupported characters');
  const letterCase = body.letterCase || 'original';
  if (!['original', 'uppercase', 'lowercase'].includes(letterCase)) throw new ApiError(400, 'Invalid lettering case');
  const fontFamily = requiredText(body.fontFamily, 'Font family', 80);
  if (!/^[\p{L}\p{N} _-]+$/u.test(fontFamily)) throw new ApiError(400, 'Invalid font family');
  const fontCategory = requiredText(body.fontCategory, 'Font category', 40);
  const fontWeight = finiteNumber(body.fontWeight, 'Font weight', 100, 900);
  if (fontWeight % 100 !== 0) throw new ApiError(400, 'Font weight must be a multiple of 100');
  if (typeof body.italic !== 'boolean') throw new ApiError(400, 'Italic must be a boolean');
  const fontSize = finiteNumber(body.fontSize, 'Font size', 8, 240);
  const letterSpacing = finiteNumber(body.letterSpacing, 'Letter spacing', -5, 30);
  const lineSpacing = finiteNumber(body.lineSpacing, 'Line spacing', 0.8, 3);
  if (!ALIGNMENTS.includes(body.alignment)) throw new ApiError(400, 'Invalid text alignment');
  const color = body.color;
  if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) throw new ApiError(400, 'Invalid preview color');
  return { text, letterCase, fontFamily, fontCategory, fontWeight, italic: body.italic, fontSize, letterSpacing, lineSpacing, alignment: body.alignment, color };
}

exports.submitFeedback = asyncHandler(async (req, res) => {
  const customerName = requiredText(req.body.customerName, 'Customer name', 100).trim();
  const contactEmail = optionalText(req.body.contactEmail, 'Contact email', 254).trim();
  if (contactEmail && (contactEmail.includes('@')
    ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    : !/^[+\d().\s-]{5,30}$/.test(contactEmail))) {
    throw new ApiError(400, 'Enter a valid email address or phone number');
  }
  const rating = finiteNumber(req.body.rating, 'Rating', 1, 5);
  if (!Number.isInteger(rating)) throw new ApiError(400, 'Rating must be a whole number from 1 to 5');
  const message = requiredText(req.body.message, 'Feedback message', 2000).trim();

  let image = { imageUrl: '', imagePublicId: '' };
  if (req.file) {
    if (!hasImageSignature(req.file.buffer)) throw new ApiError(400, 'The uploaded file is not a valid image');
    image = await saveImage(req.file);
  }
  try {
    const feedback = await Feedback.create({ customerName, contactEmail, rating, message, ...image });
    res.status(201).json({ success: true, message: 'Thank you. Your feedback has been submitted for review.', data: { id: feedback._id, status: feedback.status } });
  } catch (err) {
    if (image.imagePublicId) await deleteImage(image.imagePublicId);
    throw err;
  }
});

exports.listApprovedFeedback = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
  const [items, total] = await Promise.all([
    Feedback.find({ status: 'approved' }).select('customerName rating message imageUrl createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Feedback.countDocuments({ status: 'approved' }),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
});

exports.listFeedback = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = {};
  if (req.query.status) {
    if (!FEEDBACK_STATUSES.includes(req.query.status)) throw new ApiError(400, 'Invalid feedback status');
    filter.status = req.query.status;
  }
  const [items, total] = await Promise.all([
    Feedback.find(filter).select('-imagePublicId').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Feedback.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
});

exports.updateFeedbackStatus = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'feedback id');
  if (!FEEDBACK_STATUSES.includes(req.body.status)) throw new ApiError(400, 'Invalid feedback status');
  const feedback = await Feedback.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true }).select('-imagePublicId');
  if (!feedback) throw new ApiError(404, 'Feedback not found');
  res.json({ success: true, message: 'Feedback status updated', data: feedback });
});

exports.deleteFeedback = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'feedback id');
  const feedback = await Feedback.findByIdAndDelete(req.params.id);
  if (!feedback) throw new ApiError(404, 'Feedback not found');
  await deleteImage(feedback.imagePublicId);
  res.json({ success: true, message: 'Feedback deleted' });
});

exports.submitLetteringRequest = asyncHandler(async (req, res) => {
  const design = cleanDesign(req.body.design || {});
  const customerName = optionalText(req.body.customerName, 'Customer name', 100).trim();
  const rollNumber = optionalText(req.body.rollNumber, 'Roll number', 40).trim();
  const contact = optionalText(req.body.contact, 'Contact', 254).trim();
  const placement = optionalText(req.body.placement, 'Placement', 100).trim();
  const instructions = optionalText(req.body.instructions, 'Instructions', 2000);
  const width = req.body.width === '' || req.body.width === undefined ? null : finiteNumber(req.body.width, 'Width', 0, 1000);
  const height = req.body.height === '' || req.body.height === undefined ? null : finiteNumber(req.body.height, 'Height', 0, 1000);
  const sizeUnit = req.body.sizeUnit || 'cm';
  if (!SIZE_UNITS.includes(sizeUnit)) throw new ApiError(400, 'Invalid size unit');
  if (typeof req.body.suggestAdjustments !== 'boolean') throw new ApiError(400, 'Suggest adjustments must be a boolean');
  if (contact && (contact.includes('@')
    ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
    : !/^[+\d().\s-]{5,30}$/.test(contact))) throw new ApiError(400, 'Enter a valid email address or phone number');

  const saved = await LetteringRequest.create({
    customerName, rollNumber, contact, design, placement, width, height, sizeUnit, instructions,
    suggestAdjustments: req.body.suggestAdjustments, svg: createSvg(design),
  });
  res.status(201).json({
    success: true,
    message: 'Your lettering design has been submitted for review.',
    data: { requestId: saved.requestId, status: saved.status },
  });
});

exports.listLetteringRequests = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = {};
  if (req.query.status) {
    if (!REQUEST_STATUSES.includes(req.query.status)) throw new ApiError(400, 'Invalid lettering request status');
    filter.status = req.query.status;
  }
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const search = escapeRegex(req.query.search.trim().slice(0, 80));
    filter.$or = [{ requestId: new RegExp(search, 'i') }, { customerName: new RegExp(search, 'i') }, { rollNumber: new RegExp(search, 'i') }, { 'design.text': new RegExp(search, 'i') }];
  }
  const [items, total] = await Promise.all([
    LetteringRequest.find(filter).select('requestId customerName rollNumber design.text status createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    LetteringRequest.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
});

exports.getLetteringRequest = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'lettering request id');
  const item = await LetteringRequest.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Lettering request not found');
  res.json({ success: true, data: item });
});

exports.updateLetteringRequest = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'lettering request id');
  const updates = {};
  if (req.body.status !== undefined) {
    if (!REQUEST_STATUSES.includes(req.body.status)) throw new ApiError(400, 'Invalid lettering request status');
    updates.status = req.body.status;
  }
  if (req.body.internalNotes !== undefined) updates.internalNotes = optionalText(req.body.internalNotes, 'Internal notes', 4000);
  if (!Object.keys(updates).length) throw new ApiError(400, 'No valid updates provided');
  const item = await LetteringRequest.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Lettering request not found');
  res.json({ success: true, message: 'Lettering request updated', data: item });
});

exports.deleteLetteringRequest = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'lettering request id');
  const item = await LetteringRequest.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'Lettering request not found');
  res.json({ success: true, message: 'Lettering request deleted' });
});
