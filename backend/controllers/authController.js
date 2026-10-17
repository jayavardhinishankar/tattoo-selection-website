const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { COOKIE_NAME } = require('../middleware/auth');

// A valid bcrypt hash used to keep response time similar when the user does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };
}

function maxAgeMs() {
  const raw = process.env.JWT_EXPIRES_IN || '8h';
  const m = /^(\d+)([smhd])$/.exec(raw);
  if (!m) return 8 * 3600 * 1000;
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
  return Number(m[1]) * mult;
}

exports.login = asyncHandler(async (req, res) => {
  const identifier = typeof req.body.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!identifier) throw new ApiError(400, 'Email or username is required');
  if (!password) throw new ApiError(400, 'Password is required');
  if (identifier.length > 120 || password.length > 200) throw new ApiError(400, 'Invalid input');

  const admin = await Admin.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+passwordHash');
  const ok = await bcrypt.compare(password, admin ? admin.passwordHash : DUMMY_HASH);
  if (!admin || !ok) throw new ApiError(401, 'Invalid credentials');

  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: maxAgeMs() });
  res.json({
    success: true,
    message: 'Logged in',
    data: { id: admin._id, username: admin.username, email: admin.email, role: admin.role },
  });
});

exports.logout = asyncHandler(async (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ success: true, message: 'Logged out' });
});

exports.me = asyncHandler(async (req, res) => {
  const a = req.admin;
  res.json({ success: true, data: { id: a._id, username: a.username, email: a.email, role: a.role } });
});
