require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const TattooCategory = require('./models/TattooCategory');
const Tattoo = require('./models/Tattoo');
const Feedback = require('./models/Feedback');
const LetteringRequest = require('./models/LetteringRequest');
const { isCloudinaryConfigured } = require('./config/cloudinary');
const { seedCategories } = require('./utils/seedCategories');

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16 || process.env.JWT_SECRET.startsWith('replace_with')) {
    console.error('JWT_SECRET is missing or too weak. Set a long random value in backend/.env');
    process.exit(1);
  }

  await connectDB();
  await Promise.all([TattooCategory.init(), Tattoo.init(), Feedback.init(), LetteringRequest.init()]); // make sure indexes exist
  await seedCategories(); // only inserts the four defaults if the collection is empty

  if (!isCloudinaryConfigured()) {
    console.warn('Cloudinary is not configured: images are saved to backend/uploads (development only).');
  }

  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
