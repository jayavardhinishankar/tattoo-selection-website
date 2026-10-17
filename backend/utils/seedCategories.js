const TattooCategory = require('../models/TattooCategory');

const DEFAULT_CATEGORIES = [
  { name: 'Small Tattoos', description: 'Minimal, delicate designs perfect for wrists, ankles and behind the ear.', startingPrice: 299 },
  { name: 'Medium Tattoos', description: 'Balanced designs with more detail, ideal for forearms, calves and shoulders.', startingPrice: 599 },
  { name: 'Large Tattoos', description: 'Bold statement pieces for the back, chest and thighs.', startingPrice: 999 },
  { name: 'Premium Tattoos', description: 'Highly detailed, artist-crafted masterpieces and custom-level work.', startingPrice: 1499 },
];

/** Inserts the four starting categories only when no categories exist yet. */
async function seedCategories() {
  const count = await TattooCategory.countDocuments();
  if (count > 0) return false;
  await TattooCategory.insertMany(DEFAULT_CATEGORIES);
  console.log('Seeded the four default tattoo categories.');
  return true;
}

module.exports = { seedCategories, DEFAULT_CATEGORIES };

// `npm run seed` runs this file directly.
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  const connectDB = require('../config/db');
  const mongoose = require('mongoose');
  connectDB()
    .then(async () => {
      const seeded = await seedCategories();
      if (!seeded) console.log('Categories already exist - nothing to do.');
    })
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
