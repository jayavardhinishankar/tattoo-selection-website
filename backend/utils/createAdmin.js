/**
 * Controlled way to create an administrator. There is no public registration.
 *
 * Usage (interactive):   npm run create-admin
 * Usage (from .env):     set ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD then npm run create-admin
 *
 * The password is hashed with bcrypt; the plain text is never stored.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const readline = require('readline');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

function ask(rl, question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    if (!hidden) return rl.question(question, resolve);
    // Simple hidden input: mute echo while the user types.
    const stdin = process.stdin;
    process.stdout.write(question);
    const onData = (char) => {
      char = char + '';
      if (['\n', '\r', '\u0004'].includes(char)) return;
      readline.moveCursor(process.stdout, -1, 0);
      process.stdout.write(' ');
      readline.moveCursor(process.stdout, -1, 0);
    };
    stdin.on('data', onData);
    rl.question('', (answer) => {
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

function validatePassword(pw) {
  if (pw.length < 10) return 'Password must be at least 10 characters';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
    return 'Password must include uppercase, lowercase and a number';
  }
  return null;
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let username = process.env.ADMIN_USERNAME;
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;

  if (!username) username = await ask(rl, 'Admin username: ');
  if (!email) email = await ask(rl, 'Admin email: ');
  if (!password) password = await ask(rl, 'Admin password (min 10 chars, upper+lower+number): ', { hidden: true });
  rl.close();

  username = String(username || '').trim().toLowerCase();
  email = String(email || '').trim().toLowerCase();

  if (username.length < 3) throw new Error('Username must be at least 3 characters');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Please enter a valid email address');
  const pwError = validatePassword(String(password || ''));
  if (pwError) throw new Error(pwError);

  await connectDB();

  const existing = await Admin.findOne({ $or: [{ username }, { email }] });
  if (existing) throw new Error('An admin with that username or email already exists');

  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.create({ username, email, passwordHash });
  console.log(`\nAdmin "${username}" created. You can now log in at /admin/login`);
  console.log('Tip: remove ADMIN_PASSWORD from your .env file now.');
}

main()
  .catch((err) => {
    console.error('\nError:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
