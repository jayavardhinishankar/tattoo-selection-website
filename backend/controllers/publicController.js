const Tattoo = require('../models/Tattoo');
const TattooCategory = require('../models/TattooCategory');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, requireObjectId } = require('../utils/validators');

/** Adds activeTattooCount and priceRange to each category (counts only active tattoos). */
async function withStats(categories) {
  const ids = categories.map((c) => c._id);
  const stats = await Tattoo.aggregate([
    { $match: { categoryId: { $in: ids }, isActive: true } },
    { $sort: { tattooNumber: 1 } },
    {
      $group: {
        _id: '$categoryId',
        cover: { $first: '$imageUrl' },
        count: { $sum: 1 },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
  ]);
  const map = new Map(stats.map((s) => [String(s._id), s]));
  return categories.map((c) => {
    const s = map.get(String(c._id));
    return {
      ...c.toObject(),
      tattooCount: s ? s.count : 0,
      coverImage: s ? s.cover : null,
      minPrice: s ? s.minPrice : null,
      maxPrice: s ? s.maxPrice : null,
    };
  });
}

exports.listCategories = asyncHandler(async (_req, res) => {
  const categories = await TattooCategory.find({ isActive: true }).sort({ startingPrice: 1, name: 1 });
  res.json({ success: true, data: await withStats(categories) });
});

exports.getCategory = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'category id');
  const category = await TattooCategory.findOne({ _id: req.params.id, isActive: true });
  if (!category) throw new ApiError(404, 'Category not found');
  const [data] = await withStats([category]);
  res.json({ success: true, data });
});

exports.listTattoos = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100);

  // Only tattoos in active categories are public.
  const activeCategories = await TattooCategory.find({ isActive: true }).select('_id');
  let allowedIds = activeCategories.map((c) => c._id);

  const filter = { isActive: true };

  if (req.query.category) {
    requireObjectId(req.query.category, 'category id');
    allowedIds = allowedIds.filter((id) => String(id) === String(req.query.category));
  }
  filter.categoryId = { $in: allowedIds };

  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : '';
  if (search) {
    const numericPart = search.replace(/^#/, '').replace(/^tattoo\s*#?/i, '').trim();
    const or = [{ name: new RegExp(escapeRegex(search), 'i') }];
    if (/^\d+$/.test(numericPart)) or.push({ tattooNumber: Number(numericPart) });
    filter.$or = or;
  }

  const [items, total] = await Promise.all([
    Tattoo.find(filter)
      .populate('categoryId', 'name startingPrice')
      .sort({ tattooNumber: 1 })
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

async function findPublicTattoo(query) {
  const tattoo = await Tattoo.findOne({ ...query, isActive: true }).populate({
    path: 'categoryId',
    select: 'name startingPrice isActive',
  });
  if (!tattoo || !tattoo.categoryId || !tattoo.categoryId.isActive) {
    throw new ApiError(404, 'Tattoo not found');
  }
  return tattoo;
}

exports.getTattoo = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'tattoo id');
  res.json({ success: true, data: await findPublicTattoo({ _id: req.params.id }) });
});

exports.getTattooByNumber = asyncHandler(async (req, res) => {
  const n = Number(req.params.number);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, 'Invalid tattoo number');
  res.json({ success: true, data: await findPublicTattoo({ tattooNumber: n }) });
});
