const mongoose = require('mongoose');
const ApiError = require('./ApiError');

/** Remove any key starting with "$" or containing "." to block NoSQL operator injection. */
function sanitizeObject(value) {
  if (Array.isArray(value)) return value.map(sanitizeObject);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = sanitizeObject(v);
    }
    return out;
  }
  return value;
}

function sanitizeMiddleware(req, _res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.params) req.params = sanitizeObject(req.params);
  // req.query is a getter in Express 5; in Express 4 it is writable.
  try {
    req.query = sanitizeObject(req.query);
  } catch (_) {
    /* ignore */
  }
  next();
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireObjectId(value, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(value) || String(value).length !== 24) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return value;
}

function cleanString(value, { min = 0, max = 1000, field = 'Field', required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new ApiError(400, `${field} must be text`);
  // Strip angle brackets and control characters so stored text cannot carry markup.
  const cleaned = value.replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  if (required && !cleaned) throw new ApiError(400, `${field} is required`);
  if (cleaned.length < min) throw new ApiError(400, `${field} must be at least ${min} characters`);
  if (cleaned.length > max) throw new ApiError(400, `${field} must be at most ${max} characters`);
  return cleaned;
}

function cleanPrice(value, { field = 'Price', required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ApiError(400, `${field} is required`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) {
    throw new ApiError(400, `${field} must be a number between 0 and 10,000,000`);
  }
  return Math.round(n * 100) / 100;
}

function cleanBool(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  throw new ApiError(400, 'Invalid boolean value');
}

module.exports = {
  sanitizeMiddleware,
  escapeRegex,
  requireObjectId,
  cleanString,
  cleanPrice,
  cleanBool,
};
