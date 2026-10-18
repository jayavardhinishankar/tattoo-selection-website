const Tattoo = require('../models/Tattoo');
const TattooCategory = require('../models/TattooCategory');
const { Counter, nextSequence } = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  escapeRegex,
  requireObjectId,
  cleanString,
  cleanPrice,
  cleanBool,
} = require('../utils/validators');
const { saveImage, deleteImage, hasImageSignature } = require('../services/imageService');
const { suggestTattooName: suggestNameWithGemini } = require('../services/geminiService');

async function nextTattooNumber() {
  if (!(await Tattoo.exists({}))) {
    await Counter.findOneAndUpdate(
      { _id: 'tattooNumber' },
      { $set: { seq: 0 } },
      { upsert: true }
    );
  }
  return nextSequence('tattooNumber');
}

/* ------------------------------ Dashboard ------------------------------ */

exports.dashboard = asyncHandler(async (_req, res) => {
  const [totalTattoos, activeTattoos, activeCategories, totalCategories, recent] = await Promise.all([
    Tattoo.countDocuments(),
    Tattoo.countDocuments({ isActive: true }),
    TattooCategory.countDocuments({ isActive: true }),
    TattooCategory.countDocuments(),
    Tattoo.find().sort({ createdAt: -1 }).limit(6).populate('categoryId', 'name'),
  ]);
  res.json({
    success: true,
    data: { totalTattoos, activeTattoos, inactiveTattoos: totalTattoos - activeTattoos, activeCategories, totalCategories, recent },
  });
});

/* ------------------------------- Tattoos ------------------------------- */

exports.suggestTattooName = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A tattoo image is required');
  if (!hasImageSignature(req.file.buffer)) throw new ApiError(400, 'The uploaded file is not a valid image');

  const categoryId = requireObjectId(req.body.categoryId, 'category id');
  const category = await TattooCategory.findById(categoryId).select('name');
  if (!category) throw new ApiError(400, 'Selected category does not exist');

  const name = await suggestNameWithGemini({ file: req.file, categoryName: category.name });
  res.json({ success: true, data: { name } });
});

exports.listTattoos = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const filter = {};

  if (req.query.category) {
    requireObjectId(req.query.category, 'category id');
    filter.categoryId = req.query.category;
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : '';
  if (search) {
    const numericPart = search.replace(/^#/, '').trim();
    const or = [{ name: new RegExp(escapeRegex(search), 'i') }];
    if (/^\d+$/.test(numericPart)) or.push({ tattooNumber: Number(numericPart) });
    filter.$or = or;
  }

  const [items, total] = await Promise.all([
    Tattoo.find(filter)
      .populate('categoryId', 'name')
      .sort({ tattooNumber: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Tattoo.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  });
});

exports.getTattoo = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'tattoo id');
  const tattoo = await Tattoo.findById(req.params.id).populate('categoryId', 'name');
  if (!tattoo) throw new ApiError(404, 'Tattoo not found');
  res.json({ success: true, data: tattoo });
});

exports.createTattoo = asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name, { min: 2, max: 100, field: 'Name', required: true });
  const description = cleanString(req.body.description, { max: 1000, field: 'Description' }) || '';
  const price = cleanPrice(req.body.price, { required: true });
  const isActive = cleanBool(req.body.isActive);
  const categoryId = requireObjectId(req.body.categoryId, 'category id');

  if (!req.file) throw new ApiError(400, 'A tattoo image is required');
  if (!hasImageSignature(req.file.buffer)) throw new ApiError(400, 'The uploaded file is not a valid image');

  const category = await TattooCategory.findById(categoryId);
  if (!category) throw new ApiError(400, 'Selected category does not exist');

  const { imageUrl, imagePublicId } = await saveImage(req.file);

  try {
    let tattoo;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const tattooNumber = await nextTattooNumber();
      try {
        tattoo = await Tattoo.create({
          tattooNumber,
          name,
          description,
          price,
          categoryId,
          imageUrl,
          imagePublicId,
          isActive: isActive === undefined ? true : isActive,
        });
        break;
      } catch (err) {
        if (err.code !== 11000 || !err.keyPattern?.tattooNumber || attempt === 4) throw err;
        const latest = await Tattoo.findOne().sort({ tattooNumber: -1 }).select('tattooNumber').lean();
        await Counter.findOneAndUpdate(
          { _id: 'tattooNumber' },
          { $max: { seq: (latest && latest.tattooNumber) || 0 } },
          { upsert: true }
        );
      }
    }
    await tattoo.populate('categoryId', 'name');
    res.status(201).json({
      success: true,
      message: `Tattoo #${String(tattoo.tattooNumber).padStart(3, '0')} added`,
      data: tattoo,
    });
  } catch (err) {
    await deleteImage(imagePublicId); // do not leave orphan files behind
    throw err;
  }
});

exports.updateTattoo = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'tattoo id');
  const tattoo = await Tattoo.findById(req.params.id);
  if (!tattoo) throw new ApiError(404, 'Tattoo not found');

  const name = cleanString(req.body.name, { min: 2, max: 100, field: 'Name' });
  const description = cleanString(req.body.description, { max: 1000, field: 'Description' });
  const price = cleanPrice(req.body.price);
  const isActive = cleanBool(req.body.isActive);

  if (req.body.categoryId !== undefined && req.body.categoryId !== '') {
    requireObjectId(req.body.categoryId, 'category id');
    const exists = await TattooCategory.exists({ _id: req.body.categoryId });
    if (!exists) throw new ApiError(400, 'Selected category does not exist');
    tattoo.categoryId = req.body.categoryId;
  }

  if (name !== undefined) tattoo.name = name;
  if (description !== undefined) tattoo.description = description;
  if (price !== undefined) tattoo.price = price;
  if (isActive !== undefined) tattoo.isActive = isActive;
  // tattooNumber is never updated (also marked immutable in the schema).

  let oldPublicId = null;
  let newPublicId = null;
  if (req.file) {
    if (!hasImageSignature(req.file.buffer)) throw new ApiError(400, 'The uploaded file is not a valid image');
    const saved = await saveImage(req.file);
    oldPublicId = tattoo.imagePublicId;
    newPublicId = saved.imagePublicId;
    tattoo.imageUrl = saved.imageUrl;
    tattoo.imagePublicId = saved.imagePublicId;
  }

  try {
    await tattoo.save();
  } catch (err) {
    if (newPublicId) await deleteImage(newPublicId);
    throw err;
  }
  if (oldPublicId) await deleteImage(oldPublicId);

  await tattoo.populate('categoryId', 'name');
  res.json({ success: true, message: 'Tattoo updated', data: tattoo });
});

exports.deleteTattoo = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'tattoo id');
  const tattoo = await Tattoo.findByIdAndDelete(req.params.id);
  if (!tattoo) throw new ApiError(404, 'Tattoo not found');
  if (!(await Tattoo.exists({}))) {
    await Counter.findOneAndUpdate(
      { _id: 'tattooNumber' },
      { $set: { seq: 0 } },
      { upsert: true }
    );
  }
  await deleteImage(tattoo.imagePublicId);
  res.json({ success: true, message: `Tattoo #${String(tattoo.tattooNumber).padStart(3, '0')} deleted` });
});

/* ------------------------------ Categories ----------------------------- */

async function categoriesWithCounts(filter = {}) {
  const categories = await TattooCategory.find(filter).sort({ startingPrice: 1, name: 1 });
  const counts = await Tattoo.aggregate([
    { $group: { _id: '$categoryId', total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c]));
  return categories.map((c) => {
    const s = map.get(String(c._id));
    return { ...c.toObject(), tattooCount: s ? s.total : 0, activeTattooCount: s ? s.active : 0 };
  });
}

exports.listCategories = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await categoriesWithCounts() });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name, { min: 2, max: 60, field: 'Name', required: true });
  const description = cleanString(req.body.description, { max: 500, field: 'Description' }) || '';
  const startingPrice = cleanPrice(req.body.startingPrice, { field: 'Starting price', required: true });
  const isActive = cleanBool(req.body.isActive);

  const category = await TattooCategory.create({
    name,
    description,
    startingPrice,
    isActive: isActive === undefined ? true : isActive,
  });
  res.status(201).json({ success: true, message: 'Category created', data: category });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'category id');
  const category = await TattooCategory.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  const name = cleanString(req.body.name, { min: 2, max: 60, field: 'Name' });
  const description = cleanString(req.body.description, { max: 500, field: 'Description' });
  const startingPrice = cleanPrice(req.body.startingPrice, { field: 'Starting price' });
  const isActive = cleanBool(req.body.isActive);

  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (startingPrice !== undefined) category.startingPrice = startingPrice;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();
  res.json({ success: true, message: 'Category updated', data: category });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'category id');
  const category = await TattooCategory.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  const count = await Tattoo.countDocuments({ categoryId: category._id });
  if (count > 0) {
    throw new ApiError(
      409,
      `Cannot delete "${category.name}" because it still contains ${count} tattoo${count === 1 ? '' : 's'}. Move or delete them first.`
    );
  }
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
});
