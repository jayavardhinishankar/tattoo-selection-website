const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const COOKIE_NAME = 'tattoo_admin_token';

function getToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

const protect = asyncHandler(async (req, _res, next) => {
  const token = getToken(req);
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {
    throw new ApiError(401, 'Session expired or invalid. Please log in again.');
  }

  const admin = await Admin.findById(payload.id);
  if (!admin) throw new ApiError(401, 'Admin account no longer exists');

  req.admin = admin;
  next();
});

const requireAdminRole = (req, _res, next) => {
  if (!req.admin || req.admin.role !== 'admin') {
    return next(new ApiError(403, 'Administrator access required'));
  }
  next();
};

module.exports = { protect, requireAdminRole, COOKIE_NAME };
