const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/** Verify the file bytes really are an image (don't trust the client MIME type alone). */
function hasImageSignature(buf) {
  if (!buf || buf.length < 12) return false;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  return jpg || png || webp;
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'tattoo-studio', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * Saves an uploaded image and returns { imageUrl, imagePublicId }.
 * Cloudinary when configured (persistent); otherwise local disk (development only).
 */
async function saveImage(file) {
  if (isCloudinaryConfigured()) {
    const result = await uploadToCloudinary(file.buffer);
    return { imageUrl: result.secure_url, imagePublicId: result.public_id };
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype] || '.img'}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  // Stored as a relative URL; the API serves /uploads statically.
  return { imageUrl: `/uploads/${filename}`, imagePublicId: `local:${filename}` };
}

/** Best-effort removal of a previously stored image. Never throws. */
async function deleteImage(imagePublicId) {
  if (!imagePublicId) return;
  try {
    if (imagePublicId.startsWith('local:')) {
      const filename = path.basename(imagePublicId.slice(6));
      const full = path.join(UPLOAD_DIR, filename);
      if (full.startsWith(UPLOAD_DIR) && fs.existsSync(full)) fs.unlinkSync(full);
    } else if (isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(imagePublicId);
    }
  } catch (err) {
    console.warn('Image cleanup failed:', err.message);
  }
}

module.exports = { saveImage, deleteImage, hasImageSignature, UPLOAD_DIR };
