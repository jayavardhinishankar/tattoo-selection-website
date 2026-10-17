const mongoose = require('mongoose');

/**
 * Atomic, database-backed counter. Tattoo numbers come from $inc on a single
 * document, so concurrent inserts never get the same number and numbers of
 * deleted tattoos are never reused.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

async function nextSequence(name) {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
}

module.exports = { Counter, nextSequence };
