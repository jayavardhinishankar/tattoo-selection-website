const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const publicRoutes = require('./routes/publicRoutes');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { sanitizeMiddleware } = require('./utils/validators');
const { UPLOAD_DIR } = require('./services/imageService');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [
      ...(process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
      process.env.RENDER_EXTERNAL_URL,
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(sanitizeMiddleware);

// Local image fallback (development only; use Cloudinary in production)
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const frontendIndex = path.join(frontendDist, 'index.html');

app.get('/', (_req, res, next) => {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendIndex)) {
    return res.sendFile(frontendIndex, (err) => {
      if (err) next(err);
    });
  }
  res.json({ success: true, message: 'Tattoo Selection Website API is running' });
});

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));

// Public data should never be cached stale so admin changes show up immediately.
app.use('/api/categories', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api/tattoos', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api/feedback', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api', publicRoutes);
app.use('/api', customerRoutes);
app.use('/api/admin', adminRoutes);

if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { maxAge: '1d', index: false }));
  app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (_req, res, next) => {
    res.sendFile(frontendIndex, (err) => {
      if (err) next(err);
    });
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
