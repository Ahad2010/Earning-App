/* =========================================================
   upload.js — Multer config for payment-proof screenshot
   uploads (deposits). Images only, 5MB cap.
   ========================================================= */

const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "screenshots");

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, name);
  }
});

const uploadScreenshot = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP or GIF screenshots are allowed."));
    }
    cb(null, true);
  }
});

module.exports = { uploadScreenshot };
